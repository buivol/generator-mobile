var jsError = function(data)
{
    toastr.error(data.responseJSON.error.message, 'Ошибка')
    console.error(data);
    if (data.status == 403) {
        console.warning('unauthorized');
        //viewPage('login', window.location.pathname.substr(1));
    }
}