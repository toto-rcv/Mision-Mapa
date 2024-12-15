document.addEventListener("DOMContentLoaded", async () => {
    const divContent = document.getElementById("content")
    const accessToken = localStorage.getItem("accessToken")
    if (!accessToken) {
        window.location.href = "/login.html"
        return;
    }
    try {
        const protectContent = await fetch("index.html", {
            headers: {
                "Authorization": `Bearer ${accessToken}`
            }

        })

        const htmlContent = await protectContent.text()
        document.documentElement.innerHTML = htmlContent; // Reemplazar todo el HTML
        console.log(htmlContent)
    } catch (error) {

    }
})