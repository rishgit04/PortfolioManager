// ...existing code...
function updateArrowStyles() {
    const rows = document.querySelectorAll('.portfolio-table tr');
    rows.forEach(row => {
        const arrowCell = row.querySelector('.arrow-cell');
        if (arrowCell) {
            const arrow = arrowCell.querySelector('.arrow');
            if (arrow) {
                if (arrow.classList.contains('up')) {
                    arrow.classList.add('arrow-up');
                } else if (arrow.classList.contains('down')) {
                    arrow.classList.add('arrow-down');
                }
            }
        }
    });
}
// Call this function after rendering the table
updateArrowStyles();
// ...existing code...
