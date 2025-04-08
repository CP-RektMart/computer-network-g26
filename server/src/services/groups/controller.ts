import { prisma } from '@/database';
import { Group, GroupMessage } from '@prisma/client';
import { InputJsonValue } from '@prisma/client/runtime/library';

export const getGroup = async (groupId: number): Promise<Group | null> => {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  return group;
};

export const isGroupExist = async (groupId: number): Promise<boolean> => {
  const group = await prisma.group.count({ where: { id: groupId } });
  return group > 0;
};

export const isMemberOfGroup = async (userId: number, groupId: number): Promise<boolean> => {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: true },
  });
  if (group === null) {
    return false;
  }

  return !!group?.members.some((member) => member.userId === userId);
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
};

export const getGroupMessages = async (groupId: number, limit: number, before: Date): Promise<GroupMessage[] | null> => {
  return await prisma.groupMessage.findMany({
    where: {
      groupId: groupId,
      sentAt: {
        lt: before,
      },
    },
    take: limit,
    orderBy: {
      sentAt: 'desc',
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
};
