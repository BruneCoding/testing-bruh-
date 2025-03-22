// API key and CX list with automatic failover
const apiConfigs = [
  { key: "AIzaSyAuCaNe3GuMMA8b8nvUZIaFCu6Za4jFLlw", cx: "1375fdbca7dfd415b" },
  { key: "AIzaSyD57jeHwD2Nly9FbMN62OcfU7-O924vclo", cx: "711ba15024d9e4660" },
  { key: "AIzaSyDxbICJ69Fxl2f_uif2ZSsJlVul2V0fzC0", cx: "d59e4ca4c6ab448c6" },
  { key: "AIzaSyDaP57hq1iAURlvAh_IX70yEo-CchPxjYs", cx: "801a29fefbb9e4351" }, // currently offline
  { key: "AIzaSyAxaPQv1Ob12D2zN3XW65Ep_x9pvlHSZrU", cx: "a2d6981ebdb4a4b4b" }
];

let currentConfigIndex = 0;
let currentStart = 1;
let isLoading = false;

// Attach event listener for Enter key
document.getElementById("query").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    performSearch();
  }
});

function performSearch() {
  const query = document.getElementById("query").value.trim();
  if (query === "") {
    alert("Please enter a search term.");
    return;
  }

  currentStart = 1;
  isLoading = false;
  document.querySelector(".result-container").innerHTML = "";
  updateAISummary(query);

  fetchResults(query, currentStart).then((results) => {
    displayResults(results);
    currentStart += 10;
  });
}

function fetchResults(query, startIndex) {
  const config = apiConfigs[currentConfigIndex];
  const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(
    query
  )}&key=${config.key}&cx=${config.cx}&start=${startIndex}&num=10`;

  return fetch(url)
    .then((response) => {
      if (!response.ok) {
        return response.json().then((errData) => {
          if (errData.error?.code === 429 || errData.error?.code === 403) {
            currentConfigIndex++;
            if (currentConfigIndex < apiConfigs.length) {
              return fetchResults(query, startIndex);
            } else {
              throw new Error("All API keys have hit their quota limit.");
            }
          } else {
            throw new Error(
              `Error ${response.status}: ${errData.error.message}`
            );
          }
        });
      }
      return response.json();
    })
    .then((data) => data.items || []);
}

function displayResults(results) {
  const resultContainer = document.querySelector(".result-container");
  if (results.length > 0) {
    results.forEach((item) => {
      const resultDiv = document.createElement("div");
      resultDiv.className = "result";
      resultDiv.style.display = "flex";
      resultDiv.style.alignItems = "stretch";
      resultDiv.style.gap = "10px";

      const domain = new URL(item.link).hostname;
      const img = document.createElement("img");
      img.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
      img.style.width = "12.5vh";
      img.style.height = "12.5vh";
      img.style.objectFit = "cover";
      img.style.borderRadius = "8px";
      img.style.marginTop = "20px";
      img.style.scale = "0.85";
      img.style.marginLeft = "-5px";

      const content = document.createElement("div");
      content.innerHTML = `<h2><a href="${item.link}" target="_blank">${item.title}</a></h2><p>${item.snippet}</p>`;
      content.style.flex = "1";

      resultDiv.appendChild(img);
      resultDiv.appendChild(content);
      resultContainer.appendChild(resultDiv);
    });
  } else {
    resultContainer.innerHTML =
      "<p>No results found. Possible API Key overload. Try searching again to regain priority.</p>";
  }
}

window.addEventListener("scroll", () => {
  const scrollPosition = window.innerHeight + window.scrollY;
  const documentHeight = document.documentElement.scrollHeight;

  if (scrollPosition >= documentHeight - 200 && !isLoading) {
    isLoading = true;
    const query = document.getElementById("query").value.trim();
    if (query !== "") {
      fetchResults(query, currentStart).then((results) => {
        displayResults(results);
        currentStart += 10;
        isLoading = false;
      });
    }
  }
});

function formatAISummary(text) {
  return text
    .replace(/\*(.*?)\*/g, "<b>$1</b>")
    .replace(/_(.*?)_/g, "<u>$1</u>")
    .replace(/\^(.*?)\^/g, "<i>$1</i>")
    .replace(/\/new\//g, "<br><br>");
}

function updateAISummary(query) {
  const aiSummaryEl = document.getElementById("ai-summarized");
  aiSummaryEl.innerHTML = "Thinking...";

  const aiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=AIzaSyCabBCysAE2M7-0DdmXa62VMfE61Js6714`;
  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: `Answer this in a very friendly tone! You're an AI Summarizer for a search engine. Your job is to summarize the user's search query in a slightly childish but still informative and helpful way. Be like a fun mix of Grok X and a curious assistant. Keep it short, max 100 words.

Start by answering the query clearly in the first sentence, followed by a second short sentence. These two should be in the same paragraph. After that, write a new paragraph starting with /new/ (two line breaks).

Use ONLY these formatting markers:
- *word* → bold
- _word_ → underline
- ^word^ → italic

⚠️ DO NOT use HTML tags like <b>, <u>, <br>, etc. 
⚠️ DO NOT use Markdown-style **double asterisks** for bold.

Only use *word* for important stats or keywords like *3.9 billion* — never for full paragraphs.

If the query is a math problem, make the FIRST sentence fully bold using *...*.

Add fun emojis like ✨, 🤯, 🥳 where relevant, but don’t overdo it.

Now, answer this query:
${query}`
          }
        ]
      }
    ]
  };

  fetch(aiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody)
  })
    .then((res) => res.json())
    .then((data) => {
      const aiText =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "No summary available.";
      aiSummaryEl.innerHTML = formatAISummary(aiText);
    })
    .catch((err) => {
      aiSummaryEl.innerHTML = "AI summary failed.";
      console.error(err);
    });
}
