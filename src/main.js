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
  onAuthStateChanged
} from "firebase/auth";

import {
  db,
  auth,
  googleProvider
} from "./firebase.js";


// ======================================================
// ELEMENTS
// ======================================================

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

const chatList = document.getElementById("chatList");


// ======================================================
// STATE
// ======================================================

let currentChatType = "public";
let currentFriend = null;

let messageUnsubscribe = null;
let friendUnsubscribe = null;
let requestUnsubscribe = null;


// ======================================================
// SAFE ELEMENT HELPER
// ======================================================

function element(id) {
  return document.getElementById(id);
}


// ======================================================
// GOOGLE LOGIN
// ======================================================

if (googleLogin) {

  googleLogin.addEventListener("click", async () => {

    try {

      googleLogin.disabled = true;
      googleLogin.innerHTML = "Signing in...";

      await signInWithPopup(
        auth,
        googleProvider
      );

    } catch (error) {

      console.error(
        "Google login error:",
        error
      );

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

}


// ======================================================
// AUTH STATE
// ======================================================

onAuthStateChanged(auth, async (user) => {

  if (!user) {

    loginScreen?.classList.remove("hidden");
    app?.classList.add("hidden");

    return;
  }


  try {

    // Create/update user's profile
    await setDoc(
      doc(db, "users", user.uid),
      {
        name:
          user.displayName ||
          user.email?.split("@")[0] ||
          "User",

        email:
          user.email || "",

        photo:
          user.photoURL || "",

        lastSeen:
          serverTimestamp()
      },
      {
        merge: true
      }
    );

  } catch (error) {

    console.error(
      "User profile error:",
      error
    );

  }


  // Show application

  loginScreen?.classList.add("hidden");
  app?.classList.remove("hidden");


  const name =
    user.displayName ||
    user.email?.split("@")[0] ||
    "User";


  myName.textContent = name;


  // My avatar

  if (user.photoURL) {

    myAvatar.style.backgroundImage =
      `url("${user.photoURL}")`;

    myAvatar.style.backgroundSize =
      "cover";

    myAvatar.textContent = "";

  } else {

    myAvatar.style.backgroundImage = "";

    myAvatar.textContent =
      name.charAt(0).toUpperCase();

  }


  // Start systems

  listenForFriendRequests();
  loadFriends();

  // Open public chat

  openPublicChat();


  console.log(
    "Logged in:",
    user.email
  );

});


// ======================================================
// CREATE PRIVATE CHAT ID
// ======================================================

function getPrivateChatId(uid1, uid2) {

  return [uid1, uid2]
    .sort()
    .join("_");

}


// ======================================================
// SEND MESSAGE
// ======================================================

// ======================================================
// SEND MESSAGE
// ======================================================

async function sendMessage() {

  const text = messageInput?.value.trim();

  if (!text) return;

  if (!auth.currentUser) return;

  const myUid = auth.currentUser.uid;

  try {

    // ==================================================
    // PUBLIC CHAT
    // ==================================================

    if (currentChatType === "public") {

      await addDoc(
        collection(db, "messages"),
        {
          text: text,

          senderId: myUid,

          senderName:
            auth.currentUser.displayName ||
            auth.currentUser.email?.split("@")[0] ||
            "User",

          senderPhoto:
            auth.currentUser.photoURL || "",

          createdAt:
            serverTimestamp()
        }
      );

    }


    // ==================================================
    // PRIVATE FRIEND CHAT
    // ==================================================

    else if (
      currentChatType === "private" &&
      currentFriend
    ) {

      const friendUid =
        currentFriend.uid;

      const chatId =
        getPrivateChatId(
          myUid,
          friendUid
        );

      await addDoc(
        collection(
          db,
          "privateChats",
          chatId,
          "messages"
        ),
        {
          text: text,

          senderId: myUid,

          senderName:
            auth.currentUser.displayName ||
            auth.currentUser.email?.split("@")[0] ||
            "User",

          senderPhoto:
            auth.currentUser.photoURL || "",

          receiverId:
            friendUid,

          participants: [
            myUid,
            friendUid
          ],

          createdAt:
            serverTimestamp()
        }
      );

    }

    messageInput.value = "";

  } catch (error) {

    console.error(
      "Message failed:",
      error
    );

    alert(
      "Message could not be sent.\n\n" +
      error.message
    );

  }

}


// ======================================================
// SEND BUTTON
// ======================================================

if (sendBtn) {

  sendBtn.addEventListener(
    "click",
    sendMessage
  );

}


// ======================================================
// ENTER TO SEND
// ======================================================

if (messageInput) {

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

}


// ======================================================
// PUBLIC CHAT
// ======================================================

const publicChatBtn =
  element("publicChatBtn");


if (publicChatBtn) {

  publicChatBtn.addEventListener(
    "click",
    openPublicChat
  );

}


function openPublicChat() {

  if (!auth.currentUser) return;


  currentChatType = "public";
  currentFriend = null;


  document
    .querySelectorAll(".chat-item")
    .forEach(item => {

      item.classList.remove("active");

    });


  publicChatBtn?.classList.add("active");


  currentName.textContent =
    "Public Chat";

  currentStatus.textContent =
    "Everyone";

  currentAvatar.style.backgroundImage =
    "";

  currentAvatar.textContent =
    "🌎";


  if (
    window.innerWidth <= 800
  ) {

    app.classList.add(
      "mobile-chat"
    );

  }


  loadPublicMessages();

}


// ======================================================
// LOAD PUBLIC MESSAGES
// ======================================================

function loadPublicMessages() {

  if (!auth.currentUser) return;


  if (messageUnsubscribe) {

    messageUnsubscribe();

    messageUnsubscribe = null;

  }


  const messagesQuery =
    query(
      collection(db, "messages"),
      orderBy(
        "createdAt",
        "asc"
      )
    );


  messageUnsubscribe =
    onSnapshot(
      messagesQuery,
      snapshot => {

        messages.innerHTML = "";


        snapshot.forEach(
          messageDoc => {

            const data =
              messageDoc.data();


            const isMine =
              data.senderId ===
              auth.currentUser?.uid;


            addMessageToUI(
              data,
              isMine
            );

          }
        );


        scrollMessages();

      },
      error => {

        console.error(
          "Public chat error:",
          error
        );

      }
    );

}


// ======================================================
// OPEN PRIVATE FRIEND CHAT
// ======================================================

function openPrivateChat(friend) {

  if (!auth.currentUser) return;


  currentChatType =
    "private";

  currentFriend =
    friend;


  document
    .querySelectorAll(".chat-item")
    .forEach(item => {

      item.classList.remove(
        "active"
      );

    });


  currentName.textContent =
    friend.name || "User";

  currentStatus.textContent =
    "Private chat";


  const firstLetter =
    (friend.name || "U")
      .charAt(0)
      .toUpperCase();


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


  if (
    window.innerWidth <= 800
  ) {

    app.classList.add(
      "mobile-chat"
    );

  }


  loadPrivateMessages(
    friend.uid
  );

}


// ======================================================
// LOAD PRIVATE MESSAGES
// ======================================================

function loadPrivateMessages(
  friendUid
) {

  if (!auth.currentUser) return;


  if (messageUnsubscribe) {

    messageUnsubscribe();

    messageUnsubscribe = null;

  }


  const myUid =
    auth.currentUser.uid;


  const chatId =
    getPrivateChatId(
      myUid,
      friendUid
    );


  const messagesQuery =
    query(
      collection(
        db,
        "privateChats",
        chatId,
        "messages"
      ),
      orderBy(
        "createdAt",
        "asc"
      )
    );


  messageUnsubscribe =
    onSnapshot(
      messagesQuery,
      snapshot => {

        messages.innerHTML = "";


        snapshot.forEach(
          messageDoc => {

            const data =
              messageDoc.data();


            const isMine =
              data.senderId ===
              myUid;


            addMessageToUI(
              data,
              isMine
            );

          }
        );


        scrollMessages();

      },
      error => {

        console.error(
          "Private chat error:",
          error
        );

        messages.innerHTML = `
          <div class="no-messages">
            Unable to load private messages.
          </div>
        `;

      }
    );

}


// ======================================================
// MESSAGE UI
// ======================================================

function addMessageToUI(
  data,
  isMine
) {

  const message =
    document.createElement(
      "div"
    );


  message.className =
    `message ${
      isMine
        ? "sent"
        : "received"
    }`;


  let time = "";


  if (
    data.createdAt &&
    data.createdAt.toDate
  ) {

    time =
      data.createdAt
        .toDate()
        .toLocaleTimeString(
          [],
          {
            hour: "2-digit",
            minute: "2-digit"
          }
        );

  }


  message.innerHTML = `

    <div class="bubble">

      ${
        !isMine &&
        currentChatType === "public"
          ? `
            <small class="message-sender">
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

        ${
          isMine
            ? " ✓✓"
            : ""
        }

      </span>

    </div>

  `;


  messages.appendChild(
    message
  );

}


// ======================================================
// FRIEND SEARCH
// ======================================================

const findFriendsBtn =
  element("findFriendsBtn");

const friendSearchPanel =
  element("friendSearchPanel");

const friendSearchInput =
  element("friendSearchInput");

const friendSearchResults =
  element("friendSearchResults");


if (findFriendsBtn) {

  findFriendsBtn.addEventListener(
    "click",
    () => {

      friendSearchPanel?.classList.toggle(
        "hidden"
      );


      if (
        friendSearchPanel &&
        !friendSearchPanel.classList.contains(
          "hidden"
        )
      ) {

        friendSearchInput?.focus();

      }

    }
  );

}


if (friendSearchInput) {

  friendSearchInput.addEventListener(
    "input",
    searchUsers
  );

}


async function searchUsers() {

  const search =
    friendSearchInput.value
      .trim()
      .toLowerCase();


  friendSearchResults.innerHTML =
    "";


  if (!search) return;


  if (!auth.currentUser) return;


  try {

    const snapshot =
      await getDocs(
        collection(
          db,
          "users"
        )
      );


    let found = false;


    snapshot.forEach(
      userDoc => {

        const user =
          userDoc.data();


        if (
          userDoc.id ===
          auth.currentUser.uid
        ) {

          return;

        }


        const name =
          (
            user.name || ""
          ).toLowerCase();


        const email =
          (
            user.email || ""
          ).toLowerCase();


        if (
          name.includes(search) ||
          email.includes(search)
        ) {

          found = true;


          const result =
            document.createElement(
              "div"
            );


          result.className =
            "friend-result";


          result.innerHTML = `

            <div class="friend-info">

              ${
                user.photo
                  ? `
                    <img
                      class="friend-avatar"
                      src="${user.photo}"
                    >
                  `
                  : `
                    <div class="friend-avatar">
                      ${(user.name || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  `
              }

              <div>

                <strong>
                  ${escapeHTML(
                    user.name ||
                    "User"
                  )}
                </strong>

                <small>
                  ${escapeHTML(
                    user.email ||
                    ""
                  )}
                </small>

              </div>

            </div>

            <button class="add-friend-btn">
              Add
            </button>

          `;


          const button =
            result.querySelector(
              ".add-friend-btn"
            );


          button.addEventListener(
            "click",
            () => {

              sendFriendRequest(
                userDoc.id,
                user,
                button
              );

            }
          );


          friendSearchResults.appendChild(
            result
          );

        }

      }
    );


    if (!found) {

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


// ======================================================
// SEND FRIEND REQUEST
// ======================================================

async function sendFriendRequest(
  targetUserId,
  targetUser,
  button
) {

  if (!auth.currentUser) return;


  const myUid =
    auth.currentUser.uid;


  if (
    myUid === targetUserId
  ) {

    alert(
      "You cannot add yourself."
    );

    return;

  }


  button.disabled = true;
  button.textContent =
    "Checking...";


  try {

    const q =
      query(
        collection(
          db,
          "friendRequests"
        ),

        where(
          "from",
          "==",
          myUid
        ),

        where(
          "to",
          "==",
          targetUserId
        ),

        where(
          "status",
          "==",
          "pending"
        )
      );


    const existing =
      await getDocs(q);


    if (!existing.empty) {

      button.textContent =
        "Sent ✓";

      return;

    }


    await addDoc(
      collection(
        db,
        "friendRequests"
      ),
      {

        from:
          myUid,

        fromName:
          auth.currentUser.displayName ||
          "User",

        fromEmail:
          auth.currentUser.email ||
          "",

        fromPhoto:
          auth.currentUser.photoURL ||
          "",

        to:
          targetUserId,

        status:
          "pending",

        createdAt:
          serverTimestamp()

      }
    );


    button.textContent =
      "Sent ✓";


    console.log(
      "Friend request sent to:",
      targetUser.email
    );


  } catch (error) {

    console.error(
      "Friend request failed:",
      error
    );


    button.disabled =
      false;

    button.textContent =
      "Add";


    alert(
      "Could not send friend request.\n\n" +
      error.message
    );

  }

}


// ======================================================
// FRIEND REQUESTS
// ======================================================

const friendRequestsBtn =
  element("friendRequestsBtn");

const friendRequestsPanel =
  element("friendRequestsPanel");

const friendRequestsList =
  element("friendRequestsList");

const friendRequestCount =
  element("friendRequestCount");


if (friendRequestsBtn) {

  friendRequestsBtn.addEventListener(
    "click",
    () => {

      friendRequestsPanel?.classList.toggle(
        "hidden"
      );

    }
  );

}


function listenForFriendRequests() {

  if (!auth.currentUser) return;


  if (requestUnsubscribe) {

    requestUnsubscribe();

  }


  const q =
    query(
      collection(
        db,
        "friendRequests"
      ),

      where(
        "to",
        "==",
        auth.currentUser.uid
      ),

      where(
        "status",
        "==",
        "pending"
      )
    );


  requestUnsubscribe =
    onSnapshot(
      q,
      snapshot => {

        friendRequestsList.innerHTML =
          "";


        const count =
          snapshot.size;


        friendRequestCount.textContent =
          count;


        if (count > 0) {

          friendRequestCount.classList.remove(
            "hidden"
          );

        } else {

          friendRequestCount.classList.add(
            "hidden"
          );

        }


        if (count === 0) {

          friendRequestsList.innerHTML = `
            <div class="no-requests">
              No friend requests
            </div>
          `;

          return;

        }


        snapshot.forEach(
          requestDoc => {

            const request =
              requestDoc.data();


            const item =
              document.createElement(
                "div"
              );


            item.className =
              "friend-request";


            const firstLetter =
              (
                request.fromName ||
                "U"
              )
                .charAt(0)
                .toUpperCase();


            item.innerHTML = `

              ${
                request.fromPhoto
                  ? `
                    <img
                      class="request-avatar"
                      src="${request.fromPhoto}"
                    >
                  `
                  : `
                    <div class="request-avatar">
                      ${firstLetter}
                    </div>
                  `
              }

              <div class="request-info">

                <strong>
                  ${escapeHTML(
                    request.fromName ||
                    "User"
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


            item
              .querySelector(
                ".accept-request"
              )
              .addEventListener(
                "click",
                () => {

                  acceptFriendRequest(
                    requestDoc.id,
                    request
                  );

                }
              );


            item
              .querySelector(
                ".reject-request"
              )
              .addEventListener(
                "click",
                () => {

                  rejectFriendRequest(
                    requestDoc.id
                  );

                }
              );


            friendRequestsList.appendChild(
              item
            );

          }
        );

      }
    );

}


// ======================================================
// ACCEPT FRIEND
// ======================================================

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


    // Add friend to my list

    await setDoc(
      doc(
        db,
        "users",
        myUid,
        "friends",
        friendUid
      ),
      {

        uid:
          friendUid,

        name:
          request.fromName ||
          "User",

        email:
          request.fromEmail ||
          "",

        photo:
          request.fromPhoto ||
          "",

        addedAt:
          serverTimestamp()

      }
    );


    // Add me to friend's list

    await setDoc(
      doc(
        db,
        "users",
        friendUid,
        "friends",
        myUid
      ),
      {

        uid:
          myUid,

        name:
          auth.currentUser.displayName ||
          "User",

        email:
          auth.currentUser.email ||
          "",

        photo:
          auth.currentUser.photoURL ||
          "",

        addedAt:
          serverTimestamp()

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

        status:
          "accepted"

      },
      {
        merge: true
      }
    );


    alert(
      `${
        request.fromName ||
        "User"
      } is now your friend!`
    );


  } catch (error) {

    console.error(
      "Accept friend failed:",
      error
    );


    alert(
      "Could not accept friend request.\n\n" +
      error.message
    );

  }

}


// ======================================================
// REJECT FRIEND
// ======================================================

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

        status:
          "rejected"

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


// ======================================================
// LOAD FRIENDS
// ======================================================

function loadFriends() {

  if (!auth.currentUser) return;


  if (friendUnsubscribe) {

    friendUnsubscribe();

  }


  const friendsRef =
    collection(
      db,
      "users",
      auth.currentUser.uid,
      "friends"
    );


  friendUnsubscribe =
    onSnapshot(
      friendsRef,
      snapshot => {

        // Remove old Firebase friends

        document
          .querySelectorAll(
            ".firebase-friend"
          )
          .forEach(
            element =>
              element.remove()
          );


        snapshot.forEach(
          friendDoc => {

            const friend =
              friendDoc.data();


            const item =
              document.createElement(
                "div"
              );


            item.className =
              "chat-item firebase-friend";


            item.dataset.name =
              friend.name ||
              "User";


            item.dataset.uid =
              friend.uid;


            const firstLetter =
              (
                friend.name ||
                "U"
              )
                .charAt(0)
                .toUpperCase();


            item.innerHTML = `

              ${
                friend.photo
                  ? `
                    <img
                      class="chat-avatar"
                      src="${friend.photo}"
                    >
                  `
                  : `
                    <div class="chat-avatar">
                      ${firstLetter}
                    </div>
                  `
              }

              <div class="chat-info">

                <div class="chat-top">

                  <strong>
                    ${escapeHTML(
                      friend.name ||
                      "User"
                    )}
                  </strong>

                </div>

                <div class="chat-bottom">

                  <span>
                    🔒 Private chat
                  </span>

                </div>

              </div>

            `;


            item.addEventListener(
              "click",
              () => {

                openPrivateChat(
                  friend
                );

                item.classList.add(
                  "active"
                );

              }
            );


            chatList.appendChild(
              item
            );

          }
        );

      }
    );

}


// ======================================================
// SEARCH CHAT LIST
// ======================================================

if (searchInput) {

  searchInput.addEventListener(
    "input",
    () => {

      const search =
        searchInput.value
          .toLowerCase()
          .trim();


      document
        .querySelectorAll(
          ".chat-item"
        )
        .forEach(
          chat => {

            const name =
              (
                chat.dataset.name ||
                chat.textContent
              )
                .toLowerCase();


            chat.style.display =
              name.includes(search)
                ? "flex"
                : "none";

          }
        );

    }
  );

}


// ======================================================
// MOBILE BACK
// ======================================================

const backBtn =
  element("backBtn");


if (backBtn) {

  backBtn.addEventListener(
    "click",
    () => {

      app.classList.remove(
        "mobile-chat"
      );

    }
  );

}


// ======================================================
// EMOJI
// ======================================================

const emojiBtn =
  element("emojiBtn");


if (emojiBtn) {

  emojiBtn.addEventListener(
    "click",
    () => {

      messageInput.value +=
        " 😊";

      messageInput.focus();

    }
  );

}


// ======================================================
// FILE ATTACHMENT
// ======================================================

const attachBtn =
  element("attachBtn");

const fileInput =
  element("fileInput");


if (attachBtn && fileInput) {

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
        fileInput.files?.[0];


      if (!file) return;


      const attachmentText =
        `📎 ${file.name}`;


      // Put attachment name
      // into the message box

      messageInput.value =
        attachmentText;


      messageInput.focus();


      fileInput.value = "";

    }
  );

}


// ======================================================
// VOICE INPUT
// ======================================================

const voiceBtn =
  element("voiceBtn");


if (voiceBtn) {

  voiceBtn.addEventListener(
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
        event => {

          messageInput.value =
            event.results[0][0]
              .transcript;

          messageInput.focus();

        };

    }
  );

}


// ======================================================
// HELPERS
// ======================================================

function scrollMessages() {

  messages.scrollTo({

    top:
      messages.scrollHeight,

    behavior:
      "smooth"

  });

}


function escapeHTML(text) {

  const div =
    document.createElement(
      "div"
    );


  div.textContent =
    String(text);


  return div.innerHTML;

}


// ======================================================
// START
// ======================================================

console.log(
  "💬 Echo Chat loaded successfully!"
);
