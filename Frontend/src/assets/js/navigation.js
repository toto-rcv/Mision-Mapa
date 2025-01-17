// Mostar items de navegación según los permisos del usuario
export function showNavItems(userPermissions) {
    const navItems = document.querySelectorAll('.sidebar-item');
    navItems.forEach(item => {
        const permission = item.getAttribute("data-permissions");
            if (!permission || userPermissions[permission]) {
                item.classList.remove('hidden')
            } else {
                item.style.display = 'none';
            }
    });
}