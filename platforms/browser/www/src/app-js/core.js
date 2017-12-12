const version = '3.0.0 Alpha';

var serverVersion = 'unknown';
var apiUrl = false;
var token = '';



function supportStorage() {
    try {
        return 'localStorage' in window && window['localStorage'] !== null;
    } catch (e) {
        return false;
    }
}

function init() {

    $('.page').hide(0);

    if (!supportStorage()) {
        alert('Скачай нормальный браузер, динозавр!');
        return false;
    }

    token = localStorage.getItem('token');

    $.ajax({
        url: INIT_URL,
        method: "GET",
        dataType: 'json',
        data: {token: token},
        success: function (data) {
            console.log("successfully run ajax request...", data);
            serverVersion = data.version;
            apiUrl = data.apiUrl;
            fs = data.fs;
            $('.data-server-version').text(serverVersion);
            $('.data-version').text(version);
            if (data.isGuest) {
                // гость
                viewPage('login');
                hidePreloader();
            } else {
                launch();
                hidePreloader();
            }
        },
        error: jsError
    });

}



$(function () {
    init();
});