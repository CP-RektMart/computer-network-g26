import { prisma } from '@/database';
import { deleteKeysByPattern, fetchFromCacheOrDb, redis } from '@/redis';
import { GroupMessage } from '@prisma/client';
import { InputJsonValue } from '@prisma/client/runtime/library';

export const createGroup = async (groupName: string, description: string, ownerUserId: number, groupAvatar: string, MemberUserIds: number[]) => {
  const newGroup = await prisma.group.create({
    data: {
      name: groupName,
      description: description,
      avatar: groupAvatar,
      members: {
        create: MemberUserIds.map((userId) => ({
          userId: userId,
          role: userId === ownerUserId ? 'admin' : 'member',
        })),
      },
    },
  });

  return newGroup;
};

export const updateGroup = async (groupId: number, groupName: string, description: string, groupAvatar?: string) => {
  const dataToUpdate: any = {
    name: groupName,
    description: description,
  };

  if (groupAvatar) {
    dataToUpdate.avatar = groupAvatar;
  }

  const group = await prisma.group.update({
    where: { id: groupId },
    data: dataToUpdate,
  });

  await deleteKeysByPattern(`group_${groupId}/*`);
  return group;
};

export const deleteGroup = async (groupId: number) => {
  await prisma.groupMember.deleteMany({
    where: { groupId: groupId },
  });

  await prisma.groupMessage.deleteMany({
    where: { groupId: groupId },
  });

  await prisma.group.delete({
    where: { id: groupId },
  });

  await deleteKeysByPattern(`group_${groupId}/*`);
};

export const getGroup = async (groupId: number) => {
  const group = await fetchFromCacheOrDb(`group_${groupId}`, async () => {
    return await prisma.group.findUnique({
      where: { id: groupId },
      select: {
        _count: {
          select: {
            members: true,
          },
        },
        members: {
          select: {
            userId: true,
            role: true,
          },
        },
      },
    });
  });

  return group;
};

export const getGroupMembers = async (groupId: number) => {
  const redisSetKey = `group_${groupId}/member_ids`;

  const exists = await redis.exists(redisSetKey);
  if (!exists) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          select: { userId: true },
        },
      },
    });

    const userIds = group?.members.map((m) => m.userId.toString()) || [];

    if (userIds.length > 0) {
      await redis.sadd(redisSetKey, ...userIds);
      await redis.expire(redisSetKey, 1800);
    }
  }

  const fullMembers = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              isOnline: true,
              lastSeenAt: true,
            },
          },
        },
      },
    },
  });

  return fullMembers?.members || [];
};

export const isGroupExist = async (groupId: number): Promise<boolean> => {
  return fetchFromCacheOrDb(`group_${groupId}/exist`, async () => {
    const groupCount = await prisma.group.count({ where: { id: groupId } });
    return groupCount > 0;
  });
};

export const isMemberOfGroup = async (userId: number, groupId: number): Promise<boolean> => {
  const redisSetKey = `group_${groupId}/member_ids`;

  const isCached = await redis.exists(redisSetKey);
  if (isCached) {
    return (await redis.sismember(redisSetKey, userId.toString())) === 1;
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        select: { userId: true },
      },
    },
  });

  const userIds = group?.members.map((m) => m.userId.toString()) || [];

  if (userIds.length > 0) {
    await redis.sadd(redisSetKey, ...userIds);
    await redis.expire(redisSetKey, 1800);
  }

  return userIds.includes(userId.toString());
};

export const joinGroup = async (userId: number, groupId: number): Promise<boolean> => {
  const isMember = await isMemberOfGroup(userId, groupId);
  if (isMember) return false;

  await prisma.group.update({
    where: { id: groupId },
    data: {
      members: {
        create: { userId },
      },
    },
  });

  await deleteKeysByPattern(`group_${groupId}/*`);

  return true;
};

export const leaveGroup = async (userId: number, groupId: number): Promise<void> => {
  await prisma.group.update({
    where: { id: groupId },
    data: {
      members: {
        delete: {
          userId_groupId: {
            userId,
            groupId,
          },
        },
      },
    },
  });

  await deleteKeysByPattern(`group_${groupId}/*`);
};

export const saveGroupMessage = async (message: GroupMessage) => {
  await prisma.groupMessage.create({
    data: {
      content: message.content as InputJsonValue,
      groupId: message.groupId,
      userId: message.userId,
      sentAt: message.sentAt,
    },
  });

  await deleteKeysByPattern(`group_${message.groupId}/messages/*`);
};

export const getGroupMessagesBefore = async (groupId: number, limit: number, before: Date): Promise<GroupMessage[] | null> => {
  const cacheKey = `group_${groupId}/messages/before/${before.getTime()}_${limit}`;

  const messages = await fetchFromCacheOrDb<GroupMessage[]>(cacheKey, async () => {
    return prisma.groupMessage.findMany({
      where: {
        groupId: groupId,
        sentAt: {
          lt: before,
        },
      },
      take: limit,
      orderBy: {
        sentAt: 'asc',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  });

  return messages;
};

export const getGroupMessagesRecently = async (groupId: number, limit: number): Promise<GroupMessage[] | null> => {
  const cacheKey = `group_${groupId}/messages/recently/${limit}`;

  const messages = await fetchFromCacheOrDb<GroupMessage[]>(cacheKey, async () => {
    return prisma.groupMessage.findMany({
      where: {
        groupId: groupId,
      },
      take: limit,
      orderBy: {
        sentAt: 'asc',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  });

  return messages;
};

export const updateLastSeenInGroup = async (userId: number, groupId: number) => {
  await prisma.groupMember.update({
    where: {
      userId_groupId: {
        userId: userId,
        groupId: groupId,
      },
    },
    data: {
      lastSeemAt: new Date(),
    },
  });
};
