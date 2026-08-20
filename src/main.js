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

const messagesQuery = query(
  collection(db, "messages"),
  orderBy("createdAt", "asc")
);

onSnapshot(messagesQuery, (snapshot) => {
  messages.innerHTML = "";

  snapshot.forEach((doc) => {
    const data = doc.data();

    const isMine =
      data.senderId === auth.currentUser?.uid;

    const message = document.createElement("div");

    message.className =
      `message ${isMine ? "sent" : "received"}`;

    message.innerHTML = `
      <div class="bubble">
        ${escapeHTML(data.text)}
        <span class="message-time">
          ${data.senderName || "User"}
        </span>
      </div>
    `;

    messages.appendChild(message);
  });

  scrollMessages();
});

const findFriendsBtn =
  document.getElementById("findFriendsBtn");

const friendSearchPanel =
  document.getElementById("friendSearchPanel");

const friendSearchInput =
  document.getElementById("friendSearchInput");

const friendSearchResults =
  document.getElementById("friendSearchResults");


findFriendsBtn.addEventListener("click", () => {

  friendSearchPanel.classList.toggle("hidden");

  if (!friendSearchPanel.classList.contains("hidden")) {
    friendSearchInput.focus();
  }

});


friendSearchInput.addEventListener("input", async () => {

  const search =
    friendSearchInput.value.trim().toLowerCase();

  friendSearchResults.innerHTML = "";

  if (!search) return;

  try {

    const usersRef = collection(db, "users");

    const snapshot = await getDocs(usersRef);

    snapshot.forEach((userDoc) => {

      const user = userDoc.data();

      if (
        userDoc.id === auth.currentUser.uid
      ) {
        return;
      }

      const email =
        (user.email || "").toLowerCase();

      const name =
        (user.name || "").toLowerCase();

      if (
        email.includes(search) ||
        name.includes(search)
      ) {

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
                ${escapeHTML(user.name || "User")}
              </strong>

              <small>
                ${escapeHTML(user.email || "")}
              </small>
            </div>

          </div>

          <button class="add-friend-btn">
            Add
          </button>
        `;

        result
          .querySelector(".add-friend-btn")
          .addEventListener("click", () => {

            sendFriendRequest(
              userDoc.id,
              user
            );

          });

        friendSearchResults.appendChild(result);

      }

    });

  } catch (error) {

    console.error(
      "User search failed:",
      error
    );

  }

});
async function sendFriendRequest(
  targetUserId,
  targetUser
) {

  if (!auth.currentUser) return;

  try {

    await addDoc(
      collection(db, "friendRequests"),
      {
        from: auth.currentUser.uid,
        fromName:
          auth.currentUser.displayName || "User",
        fromEmail:
          auth.currentUser.email || "",
        fromPhoto:
          auth.currentUser.photoURL || "",

        to: targetUserId,

        status: "pending",

        createdAt: serverTimestamp()
      }
    );

    alert(
      `Friend request sent to ${targetUser.name}!`
    );

  } catch (error) {

    console.error(
      "Friend request failed:",
      error
    );

    alert(
      "Could not send friend request."
    );

  }

}
console.log(
  "💬 Echo Chat + Firebase Authentication loaded!"
);
