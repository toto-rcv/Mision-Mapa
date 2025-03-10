export function toProperCase(text) {
    if (!text) return ''; // Manejar texto nulo o indefinido
    return text
        .toLowerCase()
        .split(" ") 
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "); 
}

export function debounce(fn, delay = 1000) {
    let timerId = null;
    return (...args) => {
        clearTimeout(timerId);
        timerId = setTimeout(() => fn(...args), delay);
    };
};

export function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const monthIndex = date.getMonth();
    const year = date.getFullYear();
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    const formattedDate = `${day}/${months[monthIndex]}/${year}`
    const formattedTime = new Intl.DateTimeFormat('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(date);

    return `${formattedDate} ${formattedTime}`;
}

export function formatDNI(dni) {
    return dni.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}