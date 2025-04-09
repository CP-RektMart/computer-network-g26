import * as express from 'express';
import { getGroup, isGroupExist, isMemberOfGroup } from './controller';
import { AuthenticateJWT } from '@/jwt';

const router = express.Router();

// TODO: Add Swagger documentation for this endpoint
router.get('/:groupId', AuthenticateJWT, async (req: express.Request, res: express.Response) => {
  const groupId = parseInt(req.params.groupId);
  const group = await getGroup(groupId);

  const userId = (req as any).userId;

  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }

  const isMember = await isMemberOfGroup(userId, groupId);
  if (!isMember) {
    res.status(403).json({ message: 'Not a member of this group' });
    return;
  }

  res.json(group);
});

export default router;
