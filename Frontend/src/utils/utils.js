export function toProperCase(text) {
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
    const day = date.getDate(); // Día (1-31)
    const monthIndex = date.getMonth(); // Mes (0-11)
    const year = date.getFullYear(); // Año (4 dígitos)
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    const formattedDate = `${day}/${months[monthIndex]}/${year}`
    const formattedTime = new Intl.DateTimeFormat('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(date);

    return `${formattedDate} ${formattedTime}`;
}