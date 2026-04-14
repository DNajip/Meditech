$(document).ready(function () {
    const $sidebar = $('#sidebar');
    const $overlay = $('#sidebarOverlay');
    const $toggleBtn = $('#sidebarToggle');
    const $closeBtn = $('#sidebarClose');

    // Robustness check: Ensure elements exist before binding
    if ($sidebar.length && $toggleBtn.length) {
        function toggleSidebar() {
            $sidebar.toggleClass('show');
            $overlay.toggleClass('show');
        }

        $toggleBtn.on('click', toggleSidebar);
        
        if ($closeBtn.length) {
            $closeBtn.on('click', toggleSidebar);
        }
        
        if ($overlay.length) {
            $overlay.on('click', toggleSidebar);
        }

        // Accessibility: Close with ESC key
        $(document).on('keydown', function(e) {
            if (e.key === 'Escape' && $sidebar.hasClass('show')) {
                toggleSidebar();
            }
        });

        // Close sidebar on window resize if > 992px
        $(window).on('resize', function() {
            if ($(window).width() >= 992 && $sidebar.hasClass('show')) {
                $sidebar.removeClass('show');
                $overlay.removeClass('show');
            }
        });
    }

    // --- Global Numeric Input Validation ---
    // Prevent non-numeric characters in phone-like fields
    $(document).on('input', '.num-only', function() {
        this.value = this.value.replace(/\D/g, '');
    });

    // Optional: Also handle keydown for better UX
    $(document).on('keydown', '.num-only', function(e) {
        // Allow: backspace, delete, tab, escape, enter, control+a, home, end, left, right
        if ($.inArray(e.keyCode, [46, 8, 9, 27, 13, 110]) !== -1 ||
            (e.keyCode === 65 && (e.ctrlKey === true || e.metaKey === true)) || 
            (e.keyCode >= 35 && e.keyCode <= 40)) {
                 return;
        }
        // Ensure that it is a number and stop the keypress
        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
            e.preventDefault();
        }
    });

    console.log("MediTech Global Validations initialized.");
});
