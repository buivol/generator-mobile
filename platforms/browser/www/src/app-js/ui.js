var appPageCurrent = 'main';

function viewPage(pageName, noHistory) {
    $('.page').hide(0);
    $('#navigation .nav-item').removeClass('active');
    $('#navigation .nav-item[data-menu-page="' + pageName + '"]').addClass('active');
    var title = $('#navigation .nav-item[data-menu-page="' + pageName + '"] a').text();
    $('.data-title').text(title);
    $('#page-' + pageName).show(0);

    if (!noHistory) {
        history.pushState(null, document.title, pageName);
    }
    console.log('Change page ', appPageCurrent, '=>', pageName);
    document.title = title ? title : 'PSF Panel';

    if (pageName == 'groups') {
        //groupsUpdateMy();
    } else if (pageName == 'categories') {
        //categoriesInit();
    } else if (pageName == 'prices') {
        //pricesInit();
    }

    if( pageName == 'presets') {

    }


}

window.addEventListener('popstate', function (e) {
    console.log(window.location.pathname.substr(1));
    viewPage(window.location.pathname.substr(1), true);
    return false;
});

function launch() {
    $.ajax({
        url: apiUrl + 'user/me',
        method: "GET",
        dataType: 'json',
        data: {token: token},
        success: function (data) {
            localStorage.setItem("token", token);
            $('.data-account-name').text(data.name);
            viewPage(appPageCurrent);
        },
        error: jsError
    });
   // updateMiscImages();
    // fileManagerOpen(fs.prices, [], function (resp) {
    //     if(!resp){
    //         console.log('closed');
    //     } else {
    //         console.log(resp);
    //     }
    // });

}

function logout() {
    localStorage.setItem("token", null);
    token = null;
    init();
}

function hidePreloader() {
    $('.preloader').fadeOut(300);
}

function showPreloader() {
    $('.preloader').fadeIn(300);
}


$(function () {
    appPageCurrent = window.location.pathname.substr(1).length ? window.location.pathname.substr(1) : 'main';
    $(document).on('click', '.menu-link', function (e) {
        e.preventDefault();
        var id = $(this).attr('href').substr(1);

        viewPage(id);
        $("#bodyClick").trigger('click');
    });

    $(document).on('submit', "#form-login", function (e) {
        e.preventDefault();
        var data = $(this).serialize() + "&token=" + token;
        $.ajax({
            url: apiUrl + 'auth',
            method: "POST",
            dataType: 'json',
            data: data,
            success: function (data) {
                token = data.token;
                showPreloader();
                launch();
            },
            error: jsError
        });
    });

    $(document).on('click', '.logout', function (e) {
        e.preventDefault();
        logout();
    });


});