# Chess Project Backend

A multi-player chess full-stack application built for AI training purposes.

## Installation

To install the necessary dependencies, run:

```bash
npm install
```

## Running the Server

To start the server, you can use:

```bash
npm start
```

Or directly using node:

```bash
node src/server.js
```

## API Information

- **Base URL:** `http://localhost:3000`
- **Port:** 3000
- **API Base Path:** `/`

## API Reference

### Authentication Headers
All protected routes require the following headers for authentication and authorization:
- `x-user-role`: Role of the user (`admin`, `manager`, or `user`).
- `x-user-id`: Numeric ID of the user.

Additionally, Games API endpoints require these headers for gameplay logic:
- `userId`: Numeric ID of the user.
- `userRole`: Role of the user.

### Users API

#### 1. Get All Users
- **Method:** `GET`
- **Path:** `/users`
- **Allowed Roles:** `admin`, `manager`
- **Success Response:** `200 OK`
  ```json
  {
    "success": true,
    "data": [
      {
        "userId": 1,
        "firstName": "Admin",
        "lastName": "User",
        "createDate": "2026-05-14T23:26:34.161Z",
        "updateDate": "2026-05-14T23:26:34.161Z",
        "userRole": "admin",
        "wins": 0,
        "losses": 0,
        "draws": 0
      }
    ],
    "error": null
  }
  ```

#### 2. Get User by ID
- **Method:** `GET`
- **Path:** `/users/:id`
- **Allowed Roles:** `admin`, `manager`, `user` (Regular users can only access their own data)
- **Parameters:**
  - `id` (Path): The numeric ID of the user.
- **Success Response:** `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "userId": 1,
      "firstName": "Admin",
      "lastName": "User",
      "createDate": "2026-05-14T23:26:34.161Z",
      "updateDate": "2026-05-14T23:26:34.161Z",
      "userRole": "admin",
      "wins": 0,
      "losses": 0,
      "draws": 0
    },
    "error": null
  }
  ```
- **Error Response:** `404 Not Found`
  ```json
  {
    "success": false,
    "data": null,
    "error": {
      "code": "NOT_FOUND",
      "message": "User with id 999 not found",
      "details": { "field": "id", "value": "999" }
    }
  }
  ```

#### 3. Create New User
- **Method:** `POST`
- **Path:** `/users`
- **Allowed Roles:** `admin`, `manager`
- **Request Body:**
  ```json
  {
    "firstName": "John",
    "lastName": "Doe",
    "userRole": "user"
  }
  ```
- **Success Response:** `201 Created`
  ```json
  {
    "success": true,
    "data": { "userId": 3 },
    "error": null
  }
  ```
- **Error Response:** `400 Bad Request`
  ```json
  {
    "success": false,
    "data": null,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "firstName, lastName and userRole are required",
      "details": { "required": ["firstName", "lastName", "userRole"] }
    }
  }
  ```

#### 4. Update User
- **Method:** `PUT`
- **Path:** `/users/:id`
- **Allowed Roles:** `admin`, `manager`, `user` (Regular users can only update their own data)
- **Parameters:**
  - `id` (Path): The numeric ID of the user.
- **Request Body:**
  ```json
  {
    "firstName": "John",
    "lastName": "Doe",
    "userRole": "manager"
  }
  ```
- **Success Response:** `200 OK`
  ```json
  {
    "success": true,
    "data": { "userId": 1 },
    "error": null
  }
  ```

#### 5. Delete User
- **Method:** `DELETE`
- **Path:** `/users/:id`
- **Allowed Roles:** `admin`
- **Parameters:**
  - `id` (Path): The numeric ID of the user.
- **Success Response:** `200 OK`
  ```json
  {
    "success": true,
    "data": { "userId": 1 },
    "error": null
  }
  ```

---

### Games API

#### 1. Request Matchmaking
- **Method:** `POST`
- **Path:** `/games/new_game`
- **Allowed Roles:** `admin`, `manager`, `user`
- **Request Body:**
  ```json
  {
    "userId": 1,
    "duration": 600
  }
  ```
- **Success Response:** `201 Created`
  ```json
  {
    "success": true,
    "data": {
      "gameId": 1,
      "playerColor": "white"
    },
    "error": null
  }
  ```
- **Note:** If no opponent is available, the request waits until a match is found.

#### 2. Get Game State
- **Method:** `GET`
- **Path:** `/games/game/:gameId`
- **Allowed Roles:** `admin`, `manager`, `user`
- **Parameters:**
  - `gameId` (Path): The numeric ID of the game.
- **Success Response:** `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "id": 1,
      "white_player_id": 1,
      "black_player_id": 2,
      "current_turn": "white",
      "game_state": [ /* Board representation */ ],
      "status": "active",
      "winner": null,
      "move_history": [],
      "isCheck": { "white": false, "black": false }
    },
    "error": null
  }
  ```

#### 3. Get Legal Moves
- **Method:** `GET`
- **Path:** `/games/legal_moves/:gameId`
- **Allowed Roles:** `admin`, `manager`, `user`
- **Parameters:**
  - `gameId` (Path): The numeric ID of the game.
- **Success Response:** `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "legal_moves": [
        { "from": "e2", "to": "e4" },
        { "from": "e2", "to": "e3" }
      ]
    },
    "error": null
  }
  ```

#### 4. Submit Move
- **Method:** `PUT`
- **Path:** `/games/move/:gameId`
- **Allowed Roles:** `admin`, `manager`, `user`
- **Parameters:**
  - `gameId` (Path): The numeric ID of the game.
- **Request Body:**
  ```json
  {
    "from": "e2",
    "to": "e4"
  }
  ```
- **Success Response:** `200 OK`
  ```json
  {
    "success": true,
    "data": { "success": true },
    "error": null
  }
  ```
- **Error Response:** `400 Bad Request` (Illegal Move)
  ```json
  {
    "success": false,
    "data": null,
    "error": {
      "code": "ILLEGAL_MOVE",
      "message": "Illegal move",
      "details": { "from": "e7", "to": "e1" }
    }
  }
  ```

#### 5. List All Games
- **Method:** `GET`
- **Path:** `/games/`
- **Allowed Roles:** `admin`, `manager`
- **Success Response:** `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "gamesList": [
        {
          "id": 1,
          "white_player_id": 1,
          "black_player_id": 2,
          "current_turn": "white",
          "game_state": [ /* Board representation */ ],
          "status": "active",
          "winner": null,
          "move_history": [],
          "isCheck": { "white": false, "black": false }
        }
      ]
    },
    "error": null
  }
  ```

#### 6. Delete Game
- **Method:** `DELETE`
- **Path:** `/games/game/:id`
- **Allowed Roles:** `admin`
- **Parameters:**
  - `id` (Path): The numeric ID of the game.
- **Success Response:** `200 OK`
  ```json
  {
    "success": true,
    "data": { "success": true },
    "error": null
  }
  ```

---

### Error Responses
All errors follow a standard structure with appropriate HTTP status codes (400, 403, 404, 500).

| Status Code | Description |
| :--- | :--- |
| `400 Bad Request` | Validation errors or missing required fields. |
| `403 Forbidden` | Authorization failure (missing headers or insufficient role). |
| `404 Not Found` | The requested resource (User or Game) does not exist. |
| `500 Internal Error` | Unexpected server errors. |

**Example Error Structure:**
```json
  {
    "success": false,
    "data": null,
    "error": {
      "code": "FORBIDDEN",
      "message": "You do not have permission to perform this action.",
      "details": {}
    }
  }
  ```

## Authentication & Authorization

The API uses role-based access control (RBAC) simulated through request headers. To access protected routes, include the following headers in your requests:

- `x-user-role`: The role of the user (`admin`, `manager`, or `user`).
- `x-user-id`: The ID of the user.

### Demo Accounts (Assignment 3 — Frontend Login)

The frontend login page uses email + password credentials. The following pre-seeded accounts are available in the in-memory database:

| Email | Password | Role | User ID |
| :--- | :--- | :--- | :--- |
| `admin@chess.com` | `123456` | admin | 1 |
| `manager@chess.com` | `123456` | manager | 2 |
| `user@chess.com` | `123456` | user | 3 |

> **Note:** These credentials are stored in `UsersDatabase.js` and reset on every server restart.

## Assumptions & Implementation Details

- **Database:** The application uses an in-memory database. Data is not persistent and will be reset when the server restarts.
- **ID Generation:** Both User and Game IDs are generated using a simple auto-incrementing integer mechanism.
- **Matchmaking:** A simple queue-based matchmaking system is implemented where the first player to request a game with a specific duration waits for a second player to join.
- **Game Logic:** Full chess rules are implemented, including castling, check detection, and move validation.
