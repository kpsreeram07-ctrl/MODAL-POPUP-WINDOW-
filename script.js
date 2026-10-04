/**
 * ============================================================================
 * Modal / Popup Window - JavaScript Logic
 * 
 * Features:
 * - Multi-modal manager: Contact Modal & Gemini AI Assistant Modal
 * - Scale & fade CSS entrance/exit animations
 * - Background dimming and scroll locking
 * - Dismiss via close (×) button, outside backdrop click, or ESC key
 * - Form validation (Name, Email, Message) with inline error handling
 * - Server-side Gemini AI integration via /api/gemini/assistant & /api/gemini/draft
 * - Interactive AI Assistant chat with quick prompt chips & typing indicator
 * - In-form AI smart drafting & message polishing
 * ============================================================================
 */

document.addEventListener("DOMContentLoaded", () => {
  /* --------------------------------------------------------------------------
     1. DOM Element Selection
     -------------------------------------------------------------------------- */
  // Contact Modal elements
  const openModalBtn = document.getElementById("openModalBtn");
  const modalOverlay = document.getElementById("modalOverlay");
  const modalCloseBtn = document.getElementById("modalCloseBtn");
  const modalForm = document.getElementById("modalContactForm");
  const modalSuccessState = document.getElementById("modalSuccessState");
  const btnResetForm = document.getElementById("btnResetForm");
  const btnSuccessClose = document.getElementById("btnSuccessClose");

  // Form input elements
  const nameInput = document.getElementById("userName");
  const emailInput = document.getElementById("userEmail");
  const messageInput = document.getElementById("userMessage");
  const successNameDisplay = document.getElementById("successNameDisplay");

  // AI Assistant Modal elements
  const openAiModalBtn = document.getElementById("openAiModalBtn");
  const headerAiBtn = document.getElementById("headerAiBtn");
  const fabAiBtn = document.getElementById("fabAiBtn");
  const aiModalOverlay = document.getElementById("aiModalOverlay");
  const aiModalCloseBtn = document.getElementById("aiModalCloseBtn");
  const aiChatForm = document.getElementById("aiChatForm");
  const aiUserInput = document.getElementById("aiUserInput");
  const aiChatMessages = document.getElementById("aiChatMessages");
  const aiTypingIndicator = document.getElementById("aiTypingIndicator");
  const btnClearAiChat = document.getElementById("btnClearAiChat");
  const aiChips = document.querySelectorAll(".ai-chip[data-prompt]");

  // Form AI drafting tools
  const btnAiDraft = document.getElementById("btnAiDraft");
  const btnAiPolish = document.getElementById("btnAiPolish");
  const aiDraftStatus = document.getElementById("aiDraftStatus");

  // Track previously focused elements for accessibility
  let lastFocusedTrigger = null;

  // AI Chat History memory
  const chatHistory = [];

  /* --------------------------------------------------------------------------
     2. Generic Modal Open & Close System
     -------------------------------------------------------------------------- */

  /**
   * Opens any modal overlay element smoothly
   * @param {HTMLElement} overlayEl - The modal overlay to display
   * @param {HTMLElement} focusTarget - Element to focus after opening
   */
  function openModal(overlayEl, focusTarget) {
    if (!overlayEl) return;

    lastFocusedTrigger = document.activeElement;

    overlayEl.classList.remove("closing");
    overlayEl.classList.add("active");
    overlayEl.setAttribute("aria-hidden", "false");

    document.body.classList.add("modal-open");

    setTimeout(() => {
      if (focusTarget && typeof focusTarget.focus === "function") {
        focusTarget.focus();
      }
    }, 120);
  }

  /**
   * Closes any active modal overlay element with exit animation
   * @param {HTMLElement} overlayEl - The modal overlay to close
   */
  function closeModal(overlayEl) {
    if (!overlayEl || !overlayEl.classList.contains("active")) return;

    overlayEl.classList.add("closing");

    setTimeout(() => {
      overlayEl.classList.remove("active");
      overlayEl.classList.remove("closing");
      overlayEl.setAttribute("aria-hidden", "true");

      // Check if any other modal is still active
      const anyActive = document.querySelector(".modal-overlay.active");
      if (!anyActive) {
        document.body.classList.remove("modal-open");
      }

      if (lastFocusedTrigger && typeof lastFocusedTrigger.focus === "function") {
        lastFocusedTrigger.focus();
      }
    }, 240);
  }

  /* --------------------------------------------------------------------------
     3. Event Handlers for Contact Modal
     -------------------------------------------------------------------------- */

  if (openModalBtn) {
    openModalBtn.addEventListener("click", () => {
      openModal(modalOverlay, nameInput);
    });
  }

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", () => {
      closeModal(modalOverlay);
    });
  }

  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) {
        closeModal(modalOverlay);
      }
    });
  }

  /* --------------------------------------------------------------------------
     4. Event Handlers for AI Assistant Modal
     -------------------------------------------------------------------------- */

  function handleOpenAiModal() {
    openModal(aiModalOverlay, aiUserInput);
    scrollChatToBottom();
  }

  if (openAiModalBtn) {
    openAiModalBtn.addEventListener("click", handleOpenAiModal);
  }

  if (headerAiBtn) {
    headerAiBtn.addEventListener("click", handleOpenAiModal);
  }

  if (fabAiBtn) {
    fabAiBtn.addEventListener("click", handleOpenAiModal);
  }

  if (aiModalCloseBtn) {
    aiModalCloseBtn.addEventListener("click", () => {
      closeModal(aiModalOverlay);
    });
  }

  if (aiModalOverlay) {
    aiModalOverlay.addEventListener("click", (e) => {
      if (e.target === aiModalOverlay) {
        closeModal(aiModalOverlay);
      }
    });
  }

  // Global ESC key listener to dismiss whichever modal is currently active
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" || e.key === "Esc") {
      const activeModal = document.querySelector(".modal-overlay.active");
      if (activeModal) {
        closeModal(activeModal);
      }
    }
  });

  /* --------------------------------------------------------------------------
     5. Form Validation Helpers & Submission
     -------------------------------------------------------------------------- */

  function showError(inputElement, message) {
    const formGroup = inputElement.closest(".form-group");
    if (!formGroup) return;

    formGroup.classList.add("has-error");
    const errorMsgElement = formGroup.querySelector(".error-msg");
    if (errorMsgElement) {
      errorMsgElement.textContent = message;
    }
  }

  function clearError(inputElement) {
    const formGroup = inputElement.closest(".form-group");
    if (!formGroup) return;

    formGroup.classList.remove("has-error");
    const errorMsgElement = formGroup.querySelector(".error-msg");
    if (errorMsgElement) {
      errorMsgElement.textContent = "";
    }
  }

  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function validateForm() {
    let isValid = true;

    // Validate Name
    const nameVal = nameInput.value.trim();
    if (nameVal === "") {
      showError(nameInput, "Please enter your full name.");
      isValid = false;
    } else if (nameVal.length < 2) {
      showError(nameInput, "Name must be at least 2 characters.");
      isValid = false;
    } else {
      clearError(nameInput);
    }

    // Validate Email
    const emailVal = emailInput.value.trim();
    if (emailVal === "") {
      showError(emailInput, "Please enter your email address.");
      isValid = false;
    } else if (!isValidEmail(emailVal)) {
      showError(emailInput, "Please enter a valid email address.");
      isValid = false;
    } else {
      clearError(emailInput);
    }

    // Validate Message
    const messageVal = messageInput.value.trim();
    if (messageVal === "") {
      showError(messageInput, "Please enter a message.");
      isValid = false;
    } else if (messageVal.length < 10) {
      showError(messageInput, "Message must be at least 10 characters long.");
      isValid = false;
    } else {
      clearError(messageInput);
    }

    return isValid;
  }

  function resetForm() {
    modalForm.reset();
    clearError(nameInput);
    clearError(emailInput);
    clearError(messageInput);

    modalSuccessState.classList.remove("active");
    modalForm.style.display = "flex";
    nameInput.focus();
  }

  // Clear errors in real-time as user types
  [nameInput, emailInput, messageInput].forEach((input) => {
    if (!input) return;
    input.addEventListener("input", () => clearError(input));
  });

  // Handle Contact Form Submit
  if (modalForm) {
    modalForm.addEventListener("submit", (e) => {
      e.preventDefault();

      if (validateForm()) {
        const submittedName = nameInput.value.trim();
        if (successNameDisplay) {
          successNameDisplay.textContent = submittedName;
        }

        modalForm.style.display = "none";
        modalSuccessState.classList.add("active");

        if (btnSuccessClose) {
          btnSuccessClose.focus();
        }
      }
    });
  }

  if (btnResetForm) {
    btnResetForm.addEventListener("click", resetForm);
  }

  if (btnSuccessClose) {
    btnSuccessClose.addEventListener("click", () => {
      closeModal(modalOverlay);
      setTimeout(resetForm, 300);
    });
  }

  /* --------------------------------------------------------------------------
     6. Gemini AI Assistant: In-Form Draft & Polish Features
     -------------------------------------------------------------------------- */

  if (btnAiDraft) {
    btnAiDraft.addEventListener("click", async () => {
      const senderName = nameInput.value.trim();
      const originalText = btnAiDraft.textContent;

      try {
        btnAiDraft.disabled = true;
        btnAiDraft.textContent = "Drafting...";
        if (aiDraftStatus) {
          aiDraftStatus.style.display = "inline";
          aiDraftStatus.textContent = "Gemini is writing...";
        }

        const res = await fetch("/api/gemini/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: "Web Development Collaboration & Inquiry",
            senderName: senderName || "Visitor",
          }),
        });

        const data = await res.json();
        if (data.draft) {
          messageInput.value = data.draft;
          clearError(messageInput);
        }
      } catch (err) {
        console.error("AI Draft error:", err);
      } finally {
        btnAiDraft.disabled = false;
        btnAiDraft.textContent = originalText;
        if (aiDraftStatus) {
          aiDraftStatus.style.display = "none";
        }
      }
    });
  }

  if (btnAiPolish) {
    btnAiPolish.addEventListener("click", async () => {
      const currentMsg = messageInput.value.trim();
      if (!currentMsg) {
        showError(messageInput, "Please type a message first to polish.");
        return;
      }

      const originalText = btnAiPolish.textContent;

      try {
        btnAiPolish.disabled = true;
        btnAiPolish.textContent = "Polishing...";
        if (aiDraftStatus) {
          aiDraftStatus.style.display = "inline";
          aiDraftStatus.textContent = "Gemini is polishing...";
        }

        const res = await fetch("/api/gemini/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "polish",
            existingMessage: currentMsg,
          }),
        });

        const data = await res.json();
        if (data.draft) {
          messageInput.value = data.draft;
          clearError(messageInput);
        }
      } catch (err) {
        console.error("AI Polish error:", err);
      } finally {
        btnAiPolish.disabled = false;
        btnAiPolish.textContent = originalText;
        if (aiDraftStatus) {
          aiDraftStatus.style.display = "none";
        }
      }
    });
  }

  /* --------------------------------------------------------------------------
     7. Gemini AI Assistant: Chat Interface Logic
     -------------------------------------------------------------------------- */

  function scrollChatToBottom() {
    if (aiChatMessages) {
      aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
    }
  }

  /**
   * Lightweight markdown-to-HTML parser for formatted AI responses
   * Supports code blocks, inline code, bold, lists, and linebreaks
   */
  function formatMarkdown(text) {
    if (!text) return "";

    // Escape HTML first
    let escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Code blocks ```code```
    escaped = escaped.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");

    // Inline code `code`
    escaped = escaped.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Bold **text**
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

    // Bullet points (- or * )
    escaped = escaped.replace(/(?:^|\n)[-*]\s+(.+)/g, "<br>&bull; $1");

    // Line breaks to paragraphs
    const paragraphs = escaped
      .split(/\n\s*\n/)
      .map((p) => `<p>${p.trim()}</p>`)
      .join("");

    return paragraphs || escaped;
  }

  /**
   * Appends a message bubble to the chat container
   * @param {string} sender - 'user' | 'model'
   * @param {string} text - Message content
   */
  function appendChatMessage(sender, text) {
    if (!aiChatMessages) return;

    const msgEl = document.createElement("div");
    msgEl.className = `ai-message ai-message-${sender}`;

    const avatarEl = document.createElement("div");
    avatarEl.className = "ai-avatar";
    avatarEl.setAttribute("aria-hidden", "true");
    avatarEl.textContent = sender === "user" ? "👤" : "✨";

    const bubbleEl = document.createElement("div");
    bubbleEl.className = "ai-bubble";

    if (sender === "model") {
      bubbleEl.innerHTML = formatMarkdown(text);
    } else {
      const p = document.createElement("p");
      p.textContent = text;
      bubbleEl.appendChild(p);
    }

    msgEl.appendChild(avatarEl);
    msgEl.appendChild(bubbleEl);

    aiChatMessages.appendChild(msgEl);
    scrollChatToBottom();
  }

  /**
   * Sends user prompt to Gemini API endpoint and handles streaming/reply
   * @param {string} userText - Prompt to send
   */
  async function sendToGemini(userText) {
    if (!userText || !userText.trim()) return;

    const trimmed = userText.trim();

    // 1. Render User message
    appendChatMessage("user", trimmed);

    // 2. Clear input
    if (aiUserInput) {
      aiUserInput.value = "";
    }

    // 3. Show typing indicator
    if (aiTypingIndicator) {
      aiTypingIndicator.style.display = "flex";
      scrollChatToBottom();
    }

    try {
      // 4. Request Gemini response from our Express server endpoint
      const response = await fetch("/api/gemini/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: chatHistory,
        }),
      });

      const data = await response.json();

      // 5. Hide typing indicator
      if (aiTypingIndicator) {
        aiTypingIndicator.style.display = "none";
      }

      if (data.reply) {
        appendChatMessage("model", data.reply);

        // Keep local history for multi-turn dialogue
        chatHistory.push({ role: "user", text: trimmed });
        chatHistory.push({ role: "model", text: data.reply });
      } else {
        appendChatMessage(
          "model",
          data.error || "Sorry, I encountered an issue generating a response."
        );
      }
    } catch (err) {
      console.error("Gemini Assistant error:", err);
      if (aiTypingIndicator) {
        aiTypingIndicator.style.display = "none";
      }
      appendChatMessage(
        "model",
        "Could not connect to Gemini Assistant. Please ensure the server is running."
      );
    }
  }

  // Handle AI Chat Form Submission
  if (aiChatForm) {
    aiChatForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (aiUserInput) {
        sendToGemini(aiUserInput.value);
      }
    });
  }

  // Handle Quick Prompt Chips
  aiChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const prompt = chip.getAttribute("data-prompt");
      if (prompt) {
        sendToGemini(prompt);
      }
    });
  });

  // Handle Clear Chat
  if (btnClearAiChat) {
    btnClearAiChat.addEventListener("click", () => {
      chatHistory.length = 0;
      if (aiChatMessages) {
        aiChatMessages.innerHTML = `
          <div class="ai-message ai-message-model">
            <div class="ai-avatar" aria-hidden="true">✨</div>
            <div class="ai-bubble">
              <p>Chat cleared! How else can I assist you with this modal project or web development?</p>
            </div>
          </div>
        `;
      }
    });
  }
});
