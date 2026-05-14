const server_url = "http://localhost:3000";
const userRole = "user";
const gameDuration = "10";

const startGameBtn = document.getElementById("start-game-btn");
const messageElement = document.getElementById("home-message");

function getUserId() {
    return document.getElementById("home-user-id").value;
}

function getHeaders() {
    const userId = getUserId();
    return {
        "Content-Type": "application/json",
        "x-user-role": userRole,
        "x-user-id": userId,
        "userRole": userRole,
        "userId": userId
    };
}

startGameBtn.addEventListener("click", async () => {
    try {
        messageElement.textContent = "Requesting a game...";
        startGameBtn.disabled = true; // Prevent double-clicking

        const response = await fetch(`${server_url}/games/new_game`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
                userId: getUserId(),
                duration: gameDuration
            })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error?.message || "Failed to start game");
        }

        const data = result.data;
        const gameId = data.gameId || data.id;

        if (gameId) {
            messageElement.textContent = "Match found! Redirecting...";

            // Save the user ID to the browser's session storage (as fallback)
            sessionStorage.setItem("chessUserId", getUserId());

            // REDIRECT TO GAME PAGE WITH ID AND USERID IN URL
            window.location.href = `game.html?id=${gameId}&userId=${getUserId()}`;
        } else {
            throw new Error("No Game ID returned from server.");
        }

    } catch (error) {
        console.error("Failed to start game:", error);
        messageElement.textContent = error.message;
        startGameBtn.disabled = false;
    }
});