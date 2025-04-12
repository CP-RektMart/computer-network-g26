const io = require('socket.io-client');
const readline = require('readline');

// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwidXNlcklkIjoxLCJpYXQiOjE1MTYyMzkwMjJ9.9nfNRebFLDuENw263YLwQRvgrm7lCD5wLCf8jWDHmdI
// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyLCJ1c2VySWQiOjMsIm5hbWUiOiJFaWVpIEt1bmcifQ.vPZyQXHEI4sWwRJ2gjBai0us3q5-EBm24MagWzkj7Q4
// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJ1c2VySWQiOjJ9.VeNiTBglYMvK0iwzbtr9x9-7exyOYS0lMujvfRdNM10

let jwt;

// Create a readline interface for listening to keyboard input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Variable to hold the socket connection
let socket;
let chats = [];

console.log(`try command > jwt {token}...`);

// Method to establish the connection
const initConnection = async () => {
    console.log("Fetching user data...");

    const userData = await fetchUserData(jwt);
    if (!userData || !userData.chats) {
        console.error("Cannot fetch user data or chats are missing");
        return;
    }

    chats = userData.chats;

    // Now connect to socket after data is ready
    connectToSocket();
};


const connectToSocket = () => {
    console.log("Try to connect to socket...");

    socket = io('http://localhost:8000', {
        auth: {
            token: jwt,
        },
    });

    socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
    });

    socket.on('connect', () => {
        console.log('Connected to the server with JWT');

        // Join rooms after socket is connected
        chats.forEach(chat => {
            connectToRoom(chat.id);
        });
    });

    socket.on('socket-room-connect', (res) => {
        console.log('Received from server:', res);
    });

    socket.on('socket-room-opening', (res) => {
        console.log('Received from server:', res);
    });

    socket.on('socket-room-message', (res) => {
        console.log('Received from server:', res);
    });

    socket.on('socket-direct-open', (res) => {
        console.log('Received from server:', res);
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from the server');
    });

    socket.on('socket-group-update', (res) => {
        console.log("Group Update !!!!!");
        console.log(res);
    });
};

const fetchUserData = async (jwt) => {
    try {
        const response = await fetch("http://localhost:8000/api/users/me", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${jwt}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch user data: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("User data from API:", data);
        return data;
    } catch (error) {
        console.error("Error fetching user data:", error);
        return null;
    }
};



// Method to create a group
const createGroup = (groupName) => {
    console.log('Calling the create group method...');
    fetch("http://localhost:8000/api/groups/", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${jwt}`,
            "Content-Type": "application/json", // Specify that the body is JSON
        },
        body: JSON.stringify({
            groupName: groupName, // Send the group name as a JSON string
        })
    })
        .then(response => response.json())
        .then(data => {
            console.log("Group created:", data);
            connectToRoom(data.id)
        })
        .catch(error => {
            console.error("Error creating group:", error);
        });
};

const createDirect = (receiverId) => {
    console.log('Calling the create group method...');
    fetch(`http://localhost:8000/api/directs/${receiverId}`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${jwt}`,
        }
    })
        .then(response => response.json())
        .then(data => {
            console.log("Direct created:", data);
            connectToRoom(data.id)
        })
        .catch(error => {
            console.error("Error creating direct:", error);
        });
};

const sendMessage = (roomId, message) => {
    const newMessage = {
        destination: roomId,
        body: {
            timestamp: new Date(),
            content: {
                type: "text",
                text: message,
            }
        }
    };

    socket.emit("socket-room-message", newMessage);
};

// Method to join a group
const connectToRoom = (roomId) => {
    console.log(`connecting roomId with ID: ${roomId}...`);
    socket.emit("socket-room-connect", { destination: roomId });
};

// Method to disconnect from the server
const disconnectFromServer = () => {
    console.log('Disconnecting from the server...');
    socket.disconnect(); // Disconnect the socket
};

const printParticipant = (roomId) => {
    const room = chats.find(room => room.id === roomId);
    if (room) {
        console.log(room)
        console.log(`Participants in room ${roomId}:`);
        room.participants.forEach(participant => {
            console.log(participant);
        });
    } else {
        console.log(`Room ${roomId} not found.`);
    }
}

const fetchMorePage = (roomId, limit, before) => {
    console.log('Calling the fetch more messages method...');

    let url = `http://localhost:8000/api/rooms/${roomId}/messages?limit=${limit}`;

    if (before) {
        url += `&before=${before}`;
    }

    fetch(url, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${jwt}`,
        },
    })
        .then(response => response.json())
        .then(data => {
            console.log("Fetched messages:", data);
        })
        .catch(error => {
            console.error("Error fetching messages:", error);
        });
};

const openRoom = (roomId) => {
    console.log("try to Open the group ", roomId)
    socket.emit("socket-room-opening", { destination: roomId });
}

const joinGroup = (groupId) => {
    console.log('Calling the join group method...');
    fetch(`http://localhost:8000/api/groups/${groupId}/join`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${jwt}`,
        },
    })
        .then(response => response.json())
        .then(data => {
            console.log("Group joined:", data);
            connectToRoom(data.id)
        })
        .catch(error => {
            console.error("Error joining group:", error);
        });
}

const leaveGroup = (groupId) => {
    console.log('Calling the create group method...');
    fetch(`http://localhost:8000/api/groups/${groupId}/leave`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${jwt}`,
        },
    })
        .then(response => response.json())
        .then(data => {
            console.log("Group leaved:", data);
        })
        .catch(error => {
            console.error("Error leaving group:", error);
        });
}


// Listen for user input from the console
rl.on('line', (input) => {
    if (!jwt) {
        if (input.startsWith('jwt')) {
            jwt = input.split(' ')[1]
        } else {
            console.log("Please set jwt First")
        }
    } else {
        if (input.startsWith('join')) {
            const groupId = input.split(' ')[1]; // Get the group ID from the input
            if (groupId) {
                joinGroup(groupId);
            } else {
                console.log("Please provide a valid group ID.");
            }
        }
        else if (input.startsWith('leave')) {
            const groupId = input.split(' ')[1]; // Get the group ID from the input
            if (groupId) {
                leaveGroup(groupId);
            } else {
                console.log("Please provide a valid group ID.");
            }
        } else if (input.startsWith('createGroup')) {
            const groupName = input.split(' ')[1]; // Get the group name from the input
            if (groupName) {
                createGroup(groupName);
            } else {
                console.log("Please provide a group name.");
            }
        }
        else if (input.startsWith('createDirect')) {
            const groupName = input.split(' ')[1];
            if (groupName) {
                createDirect(groupName);
            } else {
                console.log("Please provide a receiverId.");
            }
        }
        else if (input.startsWith('pp')) {
            const parts = input.split(' ');
            const roomId = parts[1];
            printParticipant(roomId);
        }
        else if (input.startsWith('ur')) {
            const parts = input.split(' ');
            const roomId = parts[1];
            printUnreadMessages(roomId);
        }
        else if (input.startsWith('morePage')) {
            const parts = input.split(' ');
            const roomId = parts[1];
            const limit = parts[2];
            const before = parts[3] || '';
            fetchMorePage(roomId, limit, before);
        }

        else if (input.startsWith('open')) {
            const parts = input.split(' ');
            const roomId = parts[1];
            openRoom(roomId)
        }

        else if (input.startsWith('send')) {
            const parts = input.split(' ');
            const roomId = parts[1]; // Get the group ID from the input
            const message = parts.slice(2).join(' '); // Get the message from the rest of the input
            if (roomId && message) {
                sendMessage(roomId, message); // Send the message to the group
            } else {
                console.log("Please provide both a group ID and a message.");
            }
        } else if (input.startsWith('disconnect')) {
            disconnectFromServer(); // Call the disconnect method
        } else if (input.startsWith('connect')) {
            initConnection(); // Call the connect method
        } else {
            console.log(`Unknown command: ${input}`);
        }
    }
});

