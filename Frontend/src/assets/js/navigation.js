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

export function setSidebarItemsListeners(navItems) {
    navItems.forEach(item => {
        item.addEventListener('click', function () {
            navItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });
}