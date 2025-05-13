async function checkLinks() {
  const resultDiv = document.getElementById("result")
  const loadingDiv = document.getElementById("loading")
  const progressContainer = document.getElementById("progress-container")
  const progressBar = document.getElementById("progress-bar")
  const controlsDiv = document.getElementById("controls")

  // Get filter selections
  const checkLightspeed = document.getElementById("lightspeedFilter").checked

  // Validate at least one filter is selected
  if (!checkLightspeed) {
    alert("Please select at least one filter to check.")
    return
  }

  resultDiv.innerHTML = ""
  loadingDiv.style.display = "block"
  progressContainer.style.display = "block"
  progressBar.style.width = "0%"
  controlsDiv.style.display = "none"

  // Start the loading animation
  startLoadingAnimation()

  const inputText = document.getElementById("inputText").value
  const domainRegex = /([a-zA-Z0-9-]+(\.[a-zA-Z]{2,}){1,2})/g
  const extractedDomains = inputText.match(domainRegex)
  const uniqueDomains = [...new Set(extractedDomains || [])]

  if (uniqueDomains.length === 0) {
    resultDiv.innerHTML = "Please enter URLs to check."
    loadingDiv.style.display = "none"
    progressContainer.style.display = "none"
    stopLoadingAnimation()
    return
  }

  try {
    const response = await fetch("/check-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        urls: uniqueDomains,
        filters: {
          lightspeed: checkLightspeed
        },
      }),
    })

    const data = await response.json()

    console.log("Received data:", data)

    loadingDiv.style.display = "none"
    progressContainer.style.display = "none"
    stopLoadingAnimation()

    if (!data || !data.domains || data.domains.length === 0) {
      resultDiv.innerHTML = "No domains found or error processing domains."
      return
    }

    // Create table with columns based on selected filters
    const table = document.createElement("table")

    // Build table header based on selected filters
    let tableHeader = `
      <thead>
        <tr>
          <th>Domain</th>
    `

    if (checkLightspeed) {
      tableHeader += `
          <th>Lightspeed Status</th>
          <th>Lightspeed Category</th>
      `
    }

    tableHeader += `
        </tr>
      </thead>
    `

    // Build table rows based on selected filters
    const tableRows = data.domains
      .map((domain) => {
        let row = `
        <tr>
          <td>${domain.url}</td>
      `

        if (checkLightspeed) {
          row += `
          <td class="${domain.lightspeed.status === "Unblocked" ? "unblocked" : "blocked"}">${domain.lightspeed.status}</td>
          <td>${domain.lightspeed.category || "N/A"}</td>
        `
        }

        row += `
        </tr>
      `

        return row
      })
      .join("")

    table.innerHTML = tableHeader + `<tbody>${tableRows}</tbody>`
    resultDiv.appendChild(table)

    // Show controls after results are loaded
    controlsDiv.style.display = "flex"

    // Show/hide copy buttons based on selected filters
    document.getElementById("copyLightspeedUnblocked").style.display = checkLightspeed ? "flex" : "none"

    // Add event listeners for the copy buttons
    document.getElementById("copyLightspeedUnblocked").addEventListener("click", () => {
      copyUnblockedDomains(data.domains, "lightspeed")
    })

  } catch (error) {
    resultDiv.innerHTML = "Error checking links. Please try again."
    console.error("Error fetching data:", error)
    loadingDiv.style.display = "none"
    progressContainer.style.display = "none"
    stopLoadingAnimation()
  }
}

// Loading animation variables
let loadingAnimationInterval
let loadingAnimationState = 0
const loadingStates = ["Fetching.", "Fetching..", "Fetching...", "Fetching...."]

// Function to start the loading animation
function startLoadingAnimation() {
  const loadingDiv = document.getElementById("loading")
  loadingAnimationState = 0
  loadingDiv.textContent = loadingStates[loadingAnimationState]

  loadingAnimationInterval = setInterval(() => {
    loadingAnimationState = (loadingAnimationState + 1) % loadingStates.length
    loadingDiv.textContent = loadingStates[loadingAnimationState]
  }, 300) // Change the text every 300ms
}

// Function to stop the loading animation
function stopLoadingAnimation() {
  clearInterval(loadingAnimationInterval)
}

function copyUnblockedDomains(domains, filter) {
  const unblockedDomains = domains
    .filter((domain) => domain[filter].status === "Unblocked")
    .map((domain) => domain.url)
    .join("\n")

  navigator.clipboard.writeText(unblockedDomains).then(
    () => {
      alert(`Unblocked domains for ${filter} copied to clipboard!`)
    },
    (err) => {
      console.error("Could not copy text: ", err)
    },
  )
}

const progressSource = new EventSource("/progress")
progressSource.onmessage = (event) => {
  const progress = JSON.parse(event.data)
  const progressBar = document.getElementById("progress-bar")
  progressBar.style.width = progress.percentage + "%"
}

window.addEventListener("beforeunload", () => {
  progressSource.close()
})

