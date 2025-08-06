/* global */
import ReactDOM from "react-dom/client";
import "./style.css";
import { useEffect, useState } from "react";

export default function Modal({
  role,
  changeName,
  handleShow,
  handleChecked,
  updateName,
  pushEmail,
}) {
  const [correct, setCorrect] = useState(null);
  const [upgrade, setUpgrade] = useState(false);
  const [email, setEmail] = useState("");
  const [emailTxt, setEmailTxt] = useState("");
  const [validName, setValidName] = useState(false);
  const [loading, setLoading] = useState(false);
  const handleOpen = async (sites) => {
    try {
      setLoading(true);
      let addSites = [];
      let urls = [];
      const arr = sites.split(/[;\n]+/) || [];
      if (arr.length === 1 && arr?.[0] === "") {
        setCorrect(false);
        return;
      }
      let urlsHTML = "";

      if (correct && arr.length > 0) {
        for (let rawSite of arr) {
          let site = rawSite.trim();
          if (!site.startsWith("http://") && !site.startsWith("https://")) {
            site = "http://" + site;
          }

          const result = await openTab(site);
          addSites.push(result.id);
          urls.push(site);
          urlsHTML += `
          <div class="site-box">
            <input type="checkbox" name="siteUrl" class="check-url" value="${site}" checked>
            <a href="${site}" class="site-item" target="_blank">${result.title}</a>
          </div>`;
        }

        handleShow();
        handleChecked(urlsHTML, arr.length, addSites, urls);
        setLoading(false);
      }
    } catch (err) {
      setLoading(false);
      console.log("errrrrorr: ", err);
    }
  };

  function openTab(site) {
    return new Promise((resolve, reject) => {
      chrome.tabs.create({ url: site }, function (tab) {
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);

        const tabId = tab.id;
        function handleUpdate(updatedTabId, changeInfo, updatedTab) {
          if (updatedTabId === tabId && changeInfo.status === "complete") {
            chrome.tabs.onUpdated.removeListener(handleUpdate);
            resolve({
              id: tabId,
              url: updatedTab.url,
              title: updatedTab.title,
            });
          }
        }

        chrome.tabs.onUpdated.addListener(handleUpdate);
      });
    });
  }

  const handleCheckEmail = () => {
    const input = document.getElementById("input-email");
    if (input.checkValidity()) {
      setEmail(true);
      setEmailTxt(input.value);
    } else {
      setEmail(false);
    }
  };

  const handleCheckName = () => {
    const input = document.getElementById("input-name").value;
    if (input.length >= 2) {
      setValidName(true);
    } else {
      setValidName(false);
    }
  };
  const upgradeAcc = () => {
    if (email) {
      pushEmail(emailTxt);
      setUpgrade(true);
      updateName();
    }
  };
  const handleUpdateName = (newName) => {
    if (!newName || newName === "") {
      console.log("should show error");
      return;
    }
    updateName(newName, changeName.content?.keyVal);
  };

  function isValidHttpUrl(val) {
    try {
      const testVal =
        val.startsWith("http://") || val.startsWith("https://")
          ? val
          : "http://" + val;

      const url = new URL(testVal);
      const hostname = url.hostname;
      const isValid =
        (url.protocol === "http:" || url.protocol === "https:") &&
        hostname.includes(".") &&
        !hostname.startsWith(".") &&
        !hostname.endsWith(".");
      setCorrect(isValid);
      return isValid;
    } catch (error) {
      console.log("Invalid URL");
      setCorrect(false);
      return false;
    }
  }
  const getViewRole = () => {
    if (role === "missTab") {
      return (
        <div
          className="modal-box missing-box"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="missing-title">Please select at least one tab to scrape.</div>
          <div className="btns-bottom">
            <button className="cancel-btn" onClick={handleShow}>
              OK
            </button>
          </div>
        </div>
      );
    }
    if (role === "editName") {
      return (
        <div
          className="modal-box modal-name-box"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-title">New Name</div>
          <input
            id="input-name"
            className={`input-email ${validName ? "" : "invalid-input"}`}
            onChange={handleCheckName}
          />
          <div className="btns-bottom">
            <button
              className={`modal-btn ${validName ? "active-btn" : ""}`}
              role="button"
              onClick={() =>
                handleUpdateName(document.getElementById("input-name").value)
              }
            >
              Save
            </button>
            <button className="cancel-btn" onClick={handleShow}>
              Cancel
            </button>
          </div>
        </div>
      );
    }
    if (role === "openTab") {
      return (
        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
          <h2 className="modal-title">Add tabs</h2>
          <div className="modal-input">
            <textarea
              type="text"
              className={`modal-input-txt ${
                correct || correct === null ? "" : "invalid-input"
              }`}
              onChange={() =>
                isValidHttpUrl(document.querySelector(".modal-input-txt").value)
              }
              id="https-url"
              placeholder="Paste URLs Here"
            />
          </div>
          {loading && (
            <div className="textarea-loading-overlay">
              <div className="spinner" />
            </div>
          )}
          <div className="modal-bottom">
            <div
              className={`modal-btn ${correct ? " active-btn" : ""}`}
              role="button"
              onClick={() =>
                handleOpen(document.querySelector(".modal-input-txt").value)
              }
            >
              Add
            </div>
            <div className="cancel-btn" role="button" onClick={handleShow}>
              Cancel
            </div>
          </div>
        </div>
      );
    }
    if (role === "upgrade") {
      return (
        <div
          className="modal-box modal-upgrade"
          onClick={(e) => e.stopPropagation()}
        >
          {upgrade ? (
            <p>🎉 Thanks! We’ll email you as soon as Pro is available.</p>
          ) : (
            <>
              <h2>🚀 Join the Pro Beta</h2>
              <div className="modal-content">
                Be the first to try our AI‑powered prompt generator. Enter your
                email, and we'll let you know when it's live!
              </div>
              <input
                id="input-email"
                type="email"
                placeholder="your@example.com"
                className="input-email"
                onChange={handleCheckEmail}
                // onChange={handleCheckEmail}
              />
              <div className="btns-bottom">
                <button className="cancel-btn" onClick={handleShow}>
                  Cancel
                </button>
                <button
                  className={`modal-btn ${email ? " active-btn" : ""}`}
                  onClick={upgradeAcc}
                >
                  Notify Me
                </button>
              </div>
            </>
          )}
        </div>
      );
    }
  };
  return (
    <div className="modal-overlay" onClick={handleShow}>
      {getViewRole(role)};
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Modal />);
