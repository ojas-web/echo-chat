import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc,
  getDocs,
  where
} from "firebase/firestore";
import "./style.css";




import {
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "firebase/auth";

import {
  db,
  auth
} from "./firebase.js";

import {
  
  googleProvider
} from "./firebase.js";


// ============================================
// ELEMENTS
// ============================================

const loginScreen = document.getElementById("loginScreen");
const app = document.getElementById("app");
const googleLogin = document.getElementById("googleLogin");

const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const messages = document.getElementById("messages");

const searchInput = document.getElementById("searchInput");

const currentName = document.getElementById("currentName");
const currentStatus = document.getElementById("currentStatus");
const currentAvatar = document.getElementById("currentAvatar");

const myName = document.getElementById("myName");
const myAvatar = document.getElementById("myAvatar");


// ============================================
// GOOGLE LOGIN
// ============================================

googleLogin.addEventListener("click", async () => {

  try {

    googleLogin.disabled = true;
    googleLogin.innerHTML = "Signing in...";

    await signInWithPopup(
      auth,
      googleProvider
    );

  } catch (error) {

    console.error("Google login error:", error);

    alert(
      "Google login failed.\n\n" +
      error.message
    );

    googleLogin.disabled = false;

    googleLogin.innerHTML = `
      <span class="google-icon">G</span>
      Continue with Google
    `;
  }

});


// ============================================
// CHECK LOGIN STATE
// ============================================

onAuthStateChanged(auth, async (user) => {

  if (user) {
await setDoc(
  doc(db, "users", user.uid),
  {
    name: user.displayName || "User",
    email: user.email || "",
    photo: user.photoURL || "",
    lastSeen: serverTimestamp()
  },
  { merge: true }
);
    // User is logged in

    loginScreen.classList.add("hidden");
    app.classList.remove("hidden");

    const name =
      user.displayName ||
      user.email?.split("@")[0] ||
      "User";

    const photo =
      user.photoURL;

    myName.textContent = name;

    currentName.textContent = "Alex";
    currentStatus.textContent = "online";

    if (photo) {

      myAvatar.style.backgroundImage =
        `url("${photo}")`;

      myAvatar.style.backgroundSize =
        "cover";

      myAvatar.textContent = "";

    } else {

      myAvatar.textContent =
        name.charAt(0).toUpperCase();

    }

    console.log(
      "Logged in:",
      user.email
    );

  } else {

    // User is logged out

    loginScreen.classList.remove("hidden");
    app.classList.add("hidden");

  }

});


// ============================================
// SEND MESSAGE
// ============================================

async function sendMessage() {
  const text = messageInput.value.trim();

  if (!text) return;

  try {
    await addDoc(collection(db, "messages"), {
      text: text,
      senderId: auth.currentUser.uid,
      senderName: auth.currentUser.displayName,
      createdAt: serverTimestamp()
    });

    messageInput.value = "";
  } catch (error) {
    console.error("Message failed:", error);
  }
}


// ============================================
// SEND BUTTON
// ============================================

sendBtn.addEventListener(
  "click",
  sendMessage
);


// ============================================
// ENTER TO SEND
// ============================================

messageInput.addEventListener(
  "keydown",
  (event) => {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      sendMessage();

    }

  }
);


// ============================================
// CHAT SEARCH
// ============================================

searchInput.addEventListener(
  "input",
  () => {

    const query =
      searchInput.value
        .toLowerCase()
        .trim();

    document
      .querySelectorAll(".chat-item")
      .forEach((chat) => {

        const name =
          chat.dataset.name
            .toLowerCase();

        chat.style.display =
          name.includes(query)
            ? "flex"
            : "none";

      });

  }
);


// ============================================
// OPEN CHAT
// ============================================

document
  .querySelectorAll(".chat-item")
  .forEach((chat) => {

    chat.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(".chat-item")
          .forEach((item) => {

            item.classList.remove(
              "active"
            );

          });

        chat.classList.add("active");

        const name =
          chat.dataset.name;

        currentName.textContent =
          name;

        currentAvatar.textContent =
          name.charAt(0);

        currentStatus.textContent =
          name === "Alex"
            ? "online"
            : "last seen recently";

        if (
          window.innerWidth <= 800
        ) {

          app.classList.add(
            "mobile-chat"
          );

        }

      }
    );

  });


// ============================================
// MOBILE BACK
// ============================================

document
  .getElementById("backBtn")
  .addEventListener(
    "click",
    () => {

      app.classList.remove(
        "mobile-chat"
      );

    }
  );


// ============================================
// EMOJI
// ============================================

document
  .getElementById("emojiBtn")
  .addEventListener(
    "click",
    () => {

      messageInput.value += " 😊";

      messageInput.focus();

    }
  );


// ============================================
// ATTACHMENTS
// ============================================

const attachBtn =
  document.getElementById(
    "attachBtn"
  );

const fileInput =
  document.getElementById(
    "fileInput"
  );

attachBtn.addEventListener(
  "click",
  () => {

    fileInput.click();

  }
);

fileInput.addEventListener(
  "change",
  () => {

    const file =
      fileInput.files[0];

    if (!file) return;

    const message =
      document.createElement("div");

    message.className =
      "message sent";

    message.innerHTML = `
      <div class="bubble">

        📎 ${escapeHTML(file.name)}

        <span class="message-time">
          ${getTime()} ✓
        </span>

      </div>
    `;

    messages.appendChild(message);

    scrollMessages();

    fileInput.value = "";

  }
);


// ============================================
// VOICE INPUT
// ============================================

document
  .getElementById("voiceBtn")
  .addEventListener(
    "click",
    () => {

      const Recognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

      if (!Recognition) {

        alert(
          "Voice input is not supported in this browser."
        );

        return;

      }

      const recognition =
        new Recognition();

      recognition.lang =
        "en-US";

      recognition.start();

      recognition.onresult =
        (event) => {

          messageInput.value =
            event.results[0][0]
              .transcript;

          messageInput.focus();

        };

    }
  );


// ============================================
// HELPERS
// ============================================

function getTime() {

  return new Date()
    .toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });

}


function scrollMessages() {

  messages.scrollTo({
    top: messages.scrollHeight,
    behavior: "smooth"
  });

}


function escapeHTML(text) {

  const div =
    document.createElement("div");

  div.textContent = text;

  return div.innerHTML;

}

// ============================================
// PUBLIC CHAT
// ============================================

const publicChatBtn =
  document.getElementById("publicChatBtn");

let publicMessagesUnsubscribe = null;


// Open Public Chat

publicChatBtn.addEventListener("click", () => {

  // Remove active state from friend chats

  document
    .querySelectorAll(".chat-item")
    .forEach((item) => {
      item.classList.remove("active");
    });

  publicChatBtn.classList.add("active");

  currentName.textContent = "Public Chat";
  currentStatus.textContent = "Everyone";
  currentAvatar.style.backgroundImage = "";
  currentAvatar.textContent = "🌎";


  if (window.innerWidth <= 800) {
    app.classList.add("mobile-chat");
  }


  loadPublicMessages();

});


// ============================================
// LOAD PUBLIC MESSAGES
// ============================================

function loadPublicMessages() {

  // Stop previous listener

  if (publicMessagesUnsubscribe) {
    publicMessagesUnsubscribe();
  }


  const publicMessagesQuery = query(
    collection(db, "messages"),
    orderBy("createdAt", "asc")
  );


  publicMessagesUnsubscribe =
    onSnapshot(
      publicMessagesQuery,
      (snapshot) => {

        messages.innerHTML = "";


        snapshot.forEach((messageDoc) => {

          const data =
            messageDoc.data();

          const isMine =
            data.senderId ===
            auth.currentUser?.uid;


          const message =
            document.createElement("div");

          message.className =
            `message ${
              isMine
                ? "sent"
                : "received"
            }`;


          const time =
            data.createdAt?.toDate
              ? data.createdAt
                  .toDate()
                  .toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                  })
              : "";


          message.innerHTML = `

            <div class="bubble">

              ${
                !isMine
                  ? `
                    <small
                      style="
                        display:block;
                        font-weight:bold;
                        opacity:.7;
                        margin-bottom:3px;
                      "
                    >
                      ${escapeHTML(
                        data.senderName ||
                        "User"
                      )}
                    </small>
                  `
                  : ""
              }

              ${escapeHTML(
                data.text || ""
              )}

              <span class="message-time">
                ${time}
                ${isMine ? " ✓✓" : ""}
              </span>

            </div>
          `;


          messages.appendChild(message);

        });


        scrollMessages();

      },
      (error) => {

        console.error(
          "Public chat error:",
          error
        );

      }
    );

}


// ============================================
// OPEN PUBLIC CHAT BY DEFAULT
// ============================================

if (auth.currentUser) {
  loadPublicMessages();
}

// ============================================
// FIND FRIENDS
// ============================================

const findFriendsBtn =
  document.getElementById("findFriendsBtn");

const friendSearchPanel =
  document.getElementById("friendSearchPanel");

const friendSearchInput =
  document.getElementById("friendSearchInput");

const friendSearchResults =
  document.getElementById("friendSearchResults");


if (findFriendsBtn) {

  findFriendsBtn.addEventListener("click", () => {

    friendSearchPanel.classList.toggle("hidden");

    if (
      !friendSearchPanel.classList.contains("hidden")
    ) {
      friendSearchInput.focus();
    }

  });

}


// ============================================
// SEARCH USERS
// ============================================

if (friendSearchInput) {

  friendSearchInput.addEventListener(
    "input",
    async () => {

      const search =
        friendSearchInput.value
          .trim()
          .toLowerCase();

      friendSearchResults.innerHTML = "";

      if (!search) {
        return;
      }

      if (!auth.currentUser) {
        console.error("User is not logged in.");
        return;
      }

      try {

        const usersSnapshot =
          await getDocs(
            collection(db, "users")
          );

        let foundUser = false;

        usersSnapshot.forEach((userDoc) => {

          const user =
            userDoc.data();

          // Don't show yourself
          if (
            userDoc.id ===
            auth.currentUser.uid
          ) {
            return;
          }

          const name =
            (user.name || "")
              .toLowerCase();

          const email =
            (user.email || "")
              .toLowerCase();

          if (
            name.includes(search) ||
            email.includes(search)
          ) {

            foundUser = true;

            const result =
              document.createElement("div");

            result.className =
              "friend-result";

            result.innerHTML = `
              <div class="friend-info">

                <img
                  src="${user.photo || ""}"
                  class="friend-avatar"
                  onerror="this.style.display='none'"
                >

                <div>
                  <strong>
                    ${escapeHTML(
                      user.name || "User"
                    )}
                  </strong>

                  <small>
                    ${escapeHTML(
                      user.email || ""
                    )}
                  </small>
                </div>

              </div>

              <button
                class="add-friend-btn"
              >
                Add
              </button>
            `;

            const addButton =
              result.querySelector(
                ".add-friend-btn"
              );

            addButton.addEventListener(
              "click",
              () => {

                sendFriendRequest(
                  userDoc.id,
                  user,
                  addButton
                );

              }
            );

            friendSearchResults.appendChild(
              result
            );

          }

        });

        if (!foundUser) {

          friendSearchResults.innerHTML = `
            <div class="no-users">
              No users found.
            </div>
          `;

        }

      } catch (error) {

        console.error(
          "User search failed:",
          error
        );

        friendSearchResults.innerHTML = `
          <div class="no-users">
            Unable to search users.
          </div>
        `;

      }

    }
  );

}


// ============================================
// SEND FRIEND REQUEST
// ============================================

async function sendFriendRequest(
  targetUserId,
  targetUser,
  button
) {

  if (!auth.currentUser) return;

  const currentUserId =
    auth.currentUser.uid;

  if (currentUserId === targetUserId) {
    alert("You cannot add yourself.");
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "Checking...";
  }

  try {

    // Check existing requests
    const requestsQuery = query(
      collection(db, "friendRequests"),
      where("from", "==", currentUserId),
      where("to", "==", targetUserId),
      where("status", "==", "pending")
    );

    const existingRequests =
      await getDocs(requestsQuery);

    if (!existingRequests.empty) {

      if (button) {
        button.textContent = "Sent ✓";
      }

      return;
    }

    // Create request
    await addDoc(
      collection(db, "friendRequests"),
      {
        from: currentUserId,

        fromName:
          auth.currentUser.displayName ||
          "User",

        fromEmail:
          auth.currentUser.email ||
          "",

        fromPhoto:
          auth.currentUser.photoURL ||
          "",

        to: targetUserId,

        status: "pending",

        createdAt:
          serverTimestamp()
      }
    );

    if (button) {
      button.textContent = "Sent ✓";
    }

    console.log(
      "Friend request sent to:",
      targetUser.email
    );

  } catch (error) {

    console.error(
      "Friend request failed:",
      error
    );

    if (button) {
      button.textContent = "Add";
      button.disabled = false;
    }

    alert(
      "Could not send friend request.\n\n" +
      error.message
    );
  }
}
console.log(
  "💬 Echo Chat + Firebase Authentication loaded!"
);

// ============================================
// FRIEND REQUESTS
// ============================================

const friendRequestsBtn =
  document.getElementById("friendRequestsBtn");

const friendRequestsPanel =
  document.getElementById("friendRequestsPanel");

const friendRequestsList =
  document.getElementById("friendRequestsList");

const friendRequestCount =
  document.getElementById("friendRequestCount");


// Open / close requests

friendRequestsBtn.addEventListener("click", () => {

  friendRequestsPanel.classList.toggle("hidden");

});


// ============================================
// REAL-TIME FRIEND REQUESTS
// ============================================

function listenForFriendRequests() {

  if (!auth.currentUser) return;

  const requestsQuery = query(
    collection(db, "friendRequests"),
    where("to", "==", auth.currentUser.uid),
    where("status", "==", "pending")
  );

  onSnapshot(requestsQuery, (snapshot) => {

    friendRequestsList.innerHTML = "";

    const count = snapshot.size;

    // Notification number

    friendRequestCount.textContent = count;

    if (count > 0) {
      friendRequestCount.classList.remove("hidden");
    } else {
      friendRequestCount.classList.add("hidden");
    }


    if (count === 0) {

      friendRequestsList.innerHTML = `
        <div class="no-requests">
          No friend requests
        </div>
      `;

      return;
    }


    snapshot.forEach((requestDoc) => {

      const request =
        requestDoc.data();

      const item =
        document.createElement("div");

      item.className =
        "friend-request";

      const firstLetter =
        (request.fromName || "U")
          .charAt(0)
          .toUpperCase();


      item.innerHTML = `

        ${
          request.fromPhoto
          ?
          `<img
            class="request-avatar"
            src="${request.fromPhoto}"
          >`
          :
          `<div class="request-avatar">
            ${firstLetter}
          </div>`
        }

        <div class="request-info">

          <strong>
            ${escapeHTML(
              request.fromName || "User"
            )}
          </strong>

          <small>
            wants to be your friend
          </small>

        </div>

        <div class="request-buttons">

          <button
            class="accept-request"
          >
            ✓
          </button>

          <button
            class="reject-request"
          >
            ✕
          </button>

        </div>
      `;


      // ACCEPT

      item
        .querySelector(".accept-request")
        .addEventListener("click", async () => {

          await acceptFriendRequest(
            requestDoc.id,
            request
          );

        });


      // REJECT

      item
        .querySelector(".reject-request")
        .addEventListener("click", async () => {

          await rejectFriendRequest(
            requestDoc.id
          );

        });


      friendRequestsList
        .appendChild(item);

    });

  });

}


// ============================================
// ACCEPT FRIEND REQUEST
// ============================================

async function acceptFriendRequest(
  requestId,
  request
) {

  if (!auth.currentUser) return;

  try {

    const myUid =
      auth.currentUser.uid;

    const friendUid =
      request.from;


    // Create friendship for ME

    await setDoc(
      doc(
        db,
        "users",
        myUid,
        "friends",
        friendUid
      ),
      {
        uid: friendUid,
        name: request.fromName || "User",
        email: request.fromEmail || "",
        photo: request.fromPhoto || "",
        addedAt: serverTimestamp()
      }
    );


    // Create friendship for FRIEND

    await setDoc(
      doc(
        db,
        "users",
        friendUid,
        "friends",
        myUid
      ),
      {
        uid: myUid,
        name:
          auth.currentUser.displayName ||
          "User",
        email:
          auth.currentUser.email ||
          "",
        photo:
          auth.currentUser.photoURL ||
          "",
        addedAt: serverTimestamp()
      }
    );


    // Mark request accepted

    await setDoc(
      doc(
        db,
        "friendRequests",
        requestId
      ),
      {
        status: "accepted"
      },
      {
        merge: true
      }
    );


    alert(
      `${request.fromName || "User"} is now your friend!`
    );


    loadFriends();

  } catch (error) {

    console.error(
      "Accept friend request failed:",
      error
    );

    alert(
      "Could not accept friend request.\n\n" +
      error.message
    );

  }

}


// ============================================
// REJECT FRIEND REQUEST
// ============================================

async function rejectFriendRequest(
  requestId
) {

  try {

    await setDoc(
      doc(
        db,
        "friendRequests",
        requestId
      ),
      {
        status: "rejected"
      },
      {
        merge: true
      }
    );

  } catch (error) {

    console.error(
      "Reject request failed:",
      error
    );

  }

}


// ============================================
// LOAD FRIENDS INTO SIDEBAR
// ============================================

function loadFriends() {

  if (!auth.currentUser) return;

  const friendsRef =
    collection(
      db,
      "users",
      auth.currentUser.uid,
      "friends"
    );

  onSnapshot(
    friendsRef,
    (snapshot) => {

      const chatList =
        document.getElementById("chatList");

      // Remove previously loaded friends

      document
        .querySelectorAll(".firebase-friend")
        .forEach((element) => {
          element.remove();
        });


      snapshot.forEach((friendDoc) => {

        const friend =
          friendDoc.data();

        const item =
          document.createElement("div");

        item.className =
          "chat-item firebase-friend";

        item.dataset.name =
          friend.name || "User";

        item.dataset.uid =
          friend.uid;


        const firstLetter =
          (friend.name || "U")
            .charAt(0)
            .toUpperCase();


        item.innerHTML = `

          ${
            friend.photo
            ?
            `<img
              class="chat-avatar"
              src="${friend.photo}"
            >`
            :
            `<div class="chat-avatar">
              ${firstLetter}
            </div>`
          }

          <div class="chat-info">

            <div class="chat-top">

              <strong>
                ${escapeHTML(
                  friend.name || "User"
                )}
              </strong>

            </div>

            <div class="chat-bottom">

              <span>
                Friend
              </span>

            </div>

          </div>
        `;


        item.addEventListener(
          "click",
          () => {

            document
              .querySelectorAll(".chat-item")
              .forEach((chat) => {
                chat.classList.remove("active");
              });

            item.classList.add("active");

            currentName.textContent =
              friend.name || "User";

            currentStatus.textContent =
              "online";

            if (friend.photo) {

              currentAvatar.style.backgroundImage =
                `url("${friend.photo}")`;

              currentAvatar.style.backgroundSize =
                "cover";

              currentAvatar.textContent = "";

            } else {

              currentAvatar.style.backgroundImage =
                "";

              currentAvatar.textContent =
                firstLetter;

            }

            if (window.innerWidth <= 800) {

              app.classList.add(
                "mobile-chat"
              );

            }

          }
        );


        chatList.prepend(item);

      });

    }
  );

}


// ============================================
// START FRIEND SYSTEM AFTER LOGIN
// ============================================

onAuthStateChanged(auth, (user) => {

  if (user) {

    listenForFriendRequests();

    loadFriends();

  }

});
