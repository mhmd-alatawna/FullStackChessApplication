# Assignment 4 screenshot checklist

Capture real output from the running backend/frontend and MySQL. Do not submit placeholders.

1. **Database-connected application** - dashboard loaded after `npm start`, with the backend terminal
   showing successful startup after its migration check.
2. **Successful CRUD operation** - Postman responses for create, read, update, and delete under
   `User CRUD`, with the universal `{ success, data, error }` envelope visible.
3. **ORM relationships** - MySQL Workbench result for:

   ```sql
   SELECT g.id, gp.color, p.first_name, p.last_name, COUNT(gm.id) AS move_count
   FROM games g
   JOIN game_participants gp ON gp.game_id = g.id
   JOIN players p ON p.id = gp.player_id
   LEFT JOIN game_moves gm ON gm.game_id = g.id
   GROUP BY g.id, gp.color, p.id, p.first_name, p.last_name;
   ```

4. **WebSocket between two clients** - two authenticated browser tabs in the same human game after
   one tab makes a move and both boards update.
5. **AI input/output** - one human move followed by the selected backend agent's response in the
   board/move list.
6. **Database tables/migrations** - MySQL Workbench table list beside
   `migrations/schema/202606220001-create-chess-schema.js`, including `players`, `normal_users`,
   `admin_users`, `agents`, `games`, `game_moves`, `game_participants`, `sessions`,
   `matchmaking_tickets`, and `SequelizeMeta`.

Before capture, run `npm run db:status` and confirm that the pending list is empty.
