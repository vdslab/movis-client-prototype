import prisma from "~/lib/prisma";
import { NextApiRequest, NextApiResponse } from "next";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const actorId = String(req.query.actorId);

  const result = await prisma.actor.findFirst({
    where: {
      id: actorId,
    },
    include: {
      Movie: true,
    },
  });
  console.log(result);
  res.json(result);
};
