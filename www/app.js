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
var jsError = function(data)
{
    toastr.error(data.responseJSON.error.message, 'Ошибка')
    console.error(data);
    if (data.status == 403) {
        console.warning('unauthorized');
        //viewPage('login', window.location.pathname.substr(1));
    }
    formLoaderStop();
}
var filemanager, breadcrumbs, fileList;
var filemanagerCurrentDir = '/';
var filemanagerCurrentTypes = [];
var filemanagerStartDir = '/';
var defaultFilemanagerCallBack = function (path) {
    console.log('fm default callback', path)
};
var filemanagerCallback;


function fileManagerLoaderStart() {
    $('.filemanager .loader').show(0);
}

function fileManagerLoaderStop() {
    $('.filemanager .loader').hide(0);
}

function fsLs(dir) {
    fileManagerLoaderStart();
    fileList.removeClass('animated');
    fileList.css({'display': 'none'});
    $.ajax({
        url: apiUrl + 'fs/ls',
        type: "GET",
        dataType: 'json',
        data: {token: token, path: dir},
        success: function (data) {
            filemanagerCurrentDir = data.path;
            filemanager.find('.path').text(filemanagerCurrentDir);
            fileManagerRender(data.items);
        },
        error: jsError
    });
}

function fsMd(newDir, dir) {
    fileList.removeClass('animated');
    fileList.css({'display': 'none'});
    $.ajax({
        url: apiUrl + 'fs/md',
        type: "GET",
        dataType: 'json',
        data: {token: token, path: dir, name: newDir},
        success: function (data) {
            filemanagerCurrentDir = data.path;
            fsLs(filemanagerCurrentDir);
        },
        error: jsError
    });
}


function fileManagerOpen(dir, types, callback) {
    filemanagerStartDir = dir ? dir : '/';
    filemanagerCallback = callback ? callback : defaultFilemanagerCallBack;
    filemanagerCurrentTypes = types ? types : [];
    filemanager.css('display', 'block');
    fsLs(dir)
}


function escapeHTML(text) {
    return text.replace(/\&/g, '&amp;').replace(/\</g, '&lt;').replace(/\>/g, '&gt;');
}


// Convert file sizes from bytes to human readable units

function bytesToSize(bytes) {
    var sizes = ['байт', 'кб', 'мб', 'гб', 'тб'];
    if (bytes == 0) return 'пустой';
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}


function fileManagerRender(data) {

    var scannedFolders = [],
        scannedFiles = [];

    if (Array.isArray(data)) {

        data.forEach(function (d) {

            if (d.type === 'folder') {
                scannedFolders.push(d);
            }
            else if (d.type === 'file') {
                scannedFiles.push(d);
            }

        });

    }
    else if (typeof data === 'object') {

        scannedFolders = data.folders;
        scannedFiles = data.files;

    }


    // Empty the old result and make the new one

    fileList.empty().hide();

    if (!scannedFolders.length && !scannedFiles.length) {
        filemanager.find('.nothingfound').show();
    }
    else {
        filemanager.find('.nothingfound').hide();
    }


    if (scannedFolders.length) {

        scannedFolders.forEach(function (f) {

            var name = escapeHTML(f.name),
                icon = '<span class="icon folder"></span>';

            var folder = $('<li class="folders"><a href="' + f.path + '" title="' + f.path + '" class="folders">' + icon + '<span class="name">' + name + '</span></a></li>');
            folder.appendTo(fileList);
        });

    }

    if (scannedFiles.length) {

        scannedFiles.forEach(function (f) {

            var fileSize = bytesToSize(f.size),
                name = escapeHTML(f.name),
                fileType = name.split('.'),
                icon = '<span class="icon file"></span>';
            fileType = fileType[fileType.length - 1];
            if (!filemanagerCurrentTypes.length || filemanagerCurrentTypes.join(',').indexOf(fileType) >= 0) {
                icon = '<span class="icon file f-' + fileType + '">.' + fileType + '</span>';

                var file = $('<li class="files"><a href="' + f.path + '" title="' + f.path + '" class="files">' + icon + '<span class="name">' + name + '</span> <span class="details">' + fileSize + '</span></a></li>');
                file.appendTo(fileList);
            }
        });

    }


    // Generate the breadcrumbs
    fileManagerLoaderStop();

    if (filemanager.hasClass('searching')) {

        fileList.removeClass('animated');

    }
    else {

        fileList.addClass('animated');

    }

    fileList.css({'display': 'inline-block'});

}


$(function () {

    $(document).on('click', '.filemanager .actions button.action-refresh', function (e) {
        e.preventDefault();
        fsLs(filemanagerCurrentDir);
    });

    $(document).on('click', '.filemanager .actions button.action-back', function (e) {
        e.preventDefault();
        console.log(filemanagerStartDir, filemanagerCurrentDir);
        if (filemanagerStartDir.replace(/^\/|\/$/g, '') == filemanagerCurrentDir.replace(/^\/|\/$/g, '')) {
            return false;
        }
        var path = filemanagerCurrentDir.split('/');
        path.pop();
        path = path.join('/');
        fsLs(path);
    });

    $(document).on('click', '.filemanager .actions button.action-create', function (e) {
        fileManagerLoaderStart();
        var folderName = prompt("Название новой папки", "Новая папка");
        if (folderName != null) {
            fsMd(folderName, filemanagerCurrentDir);
        } else {
            fileManagerLoaderStop();
        }
    });

    $(document).on('click', '.filemanager .actions button.action-upload, .filemanager .nofiles', function (e) {
        e.preventDefault();
        $('#fs-file-field').click();
    });

    $(document).on('change', '#fs-file-field', function (e) {
        e.preventDefault();
        if ($(this).val() == '') {
            return false;
        } else {
            $('#fs-file').submit();
        }
    });

    $(document).on("submit", '#fs-file', function (e) {
        fileManagerLoaderStart();
        e.preventDefault();
        var form = $(this);
        var formData = new FormData(form[0]);
        formData.append('token', token);
        formData.append('path', filemanagerCurrentDir);
        $.ajax({
            url: apiUrl + 'fs/in',
            type: "POST",
            processData: false,
            contentType: false,
            data: formData,
            success: function (result) {
                fsLs(result.path);
            },
            error: jsError
        });
    });

    filemanager = $('.filemanager');
    breadcrumbs = $('.breadcrumbs');
    fileList = filemanager.find('.data');


    // Clicking on folders

    fileList.on('click', 'li.folders', function (e) {
        e.preventDefault();

        var nextDir = $(this).find('a.folders').attr('href');

        fsLs(nextDir);
    });

    var tmd;

    // Добавляем класс hover при наведении
    filemanager.on('dragover', function () {
        clearTimeout(tmd);
        $('body').addClass('drop');
        return false;
    });

    // Убираем класс hover
    filemanager.on('dragleave', function () {
        clearTimeout(tmd);
        tmd = setTimeout(function () {
            $('body').removeClass('drop');
        }, 600);

        return false;
    });

    // Обрабатываем событие Drop
    $('body')[0].ondrop = function (event) {
        event.preventDefault();
        $('body').removeClass('drop');
        // dropZone.removeClass('hover');
        // dropZone.addClass('drop');
        //

        console.log(event.dataTransfer);
        var file = event.dataTransfer.files[0];
        fileManagerLoaderStart();
        var form = $(this);
        var formData = new FormData(form[0]);
        formData.append('token', token);
        formData.append('file', file);
        formData.append('path', filemanagerCurrentDir);
        $.ajax({
            url: apiUrl + 'fs/in',
            type: "POST",
            processData: false,
            contentType: false,
            data: formData,
            success: function (result) {
                fsLs(result.path);
            },
            error: jsError
        });
    };

    $(document).on('click', '.filemanager a.files', function (e) {
        e.preventDefault();
        filemanager.css('display', 'none');
        var resp = {};
        resp.dir = filemanagerCurrentDir;
        resp.path = $(this).prop('title');
        resp.name = $(this).find('.name').text();
        resp.ext = $(this).find('.file').text();
        filemanagerCallback(resp);
    });

    $(document).on('click', '.fm-close', function (e) {
        e.preventDefault();
        filemanager.css('display', 'none');
        filemanagerCallback(false);
    });

});

function groupsInit(){

}
function makeid() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 15; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}
function presetsInit() {
    presetsUpdate();
}


function presetsUpdate() {
    $.ajax({
        url: apiUrl + 'groups',
        method: "GET",
        dataType: 'json',
        data: {token: token},
        success: function (data) {
            var html = '';
            if (data.count.all < 1) {
                $('#no-presets').show(0);
            } else {
                $('#no-presets').hide(0);
            }
            $.each(data.items, function (k, v) {
                html += '<div class="col-sm-6"><div class="card preset-item" data-id="' + v.id + '">';
                html += '<h3>' + v.name + '</h3>';
                html += '<div class="row"><div class="col-sm-6">';
                html += '<p>Автор: <code>' + v.owner.username + '</code></p>';
                html += '<p>Изменён: <code>' + moment.unix(v.updated, 'time').format('HH:mm DD.MM.YYYY') + '</code></p>';
                html += '</div><div class="col-sm-6 h-dr h-mc actions">';
                html += '<button class="btn btn-info btn-icon btn-icon-mini btn-round action-edit" data-id="' + v.id + '"><i class="fa fa-pencil"></i></button>';
                html += '<button class="btn btn-info btn-icon btn-icon-mini btn-round action-share" data-id="' + v.id + '"><i class="fa fa-share-alt"></i></button>';
                html += '<button class="btn btn-danger btn-icon btn-icon-mini btn-round action-delete" data-id="' + v.id + '"><i class="fa fa-trash"></i></button>';
                html += '</div></div></div></div>';
            });

            $('#presets-items').html(html);

            updateUIPresets(data.presets);
            formLoaderStop();
        },
        error: jsError
    });
}

$(function () {
    $(document).on('click', '.presets-create', function (e) {
        e.preventDefault();
        resetMiscImages();
        // cont
        updateMiscImages();
        $('#form-preset').data('preset', 'new');
        $('#createPreset').modal('show');
    });

    $(document).on('submit', '#form-preset', function (e) {
        e.preventDefault();
        formLoaderStart();
        var data = $(this).serialize() + "&token=" + token;
        var url = apiUrl + 'groups';
        if ($(this).data('preset') != 'new') {
            url += '/' + $(this).data('preset')
        }
        $.ajax({
            url: url,
            method: "POST",
            dataType: 'json',
            data: data,
            success: function (data) {
                $('#form-preset').trigger("reset");
                $('#createPreset').modal('hide');
                toastr.success(data.message, 'Успех');
                presetsUpdate();
                updateUIPresets(data.presets);
                //groupsUpdateMy(true);
            },
            error: jsError
        });
        //$('#createPreset').modal('hide');
    });

    $(document).on('click', '.preset-item .action-edit', function (e) {
        e.preventDefault();
        formLoaderStart();
        var presetId = $(this).data('id');
        $('#form-preset').data('preset', presetId);
        resetMiscImages();
        $.ajax({
            url: apiUrl + 'groups/' + presetId,
            method: "GET",
            data: {token: token},
            dataType: 'json',
            success: function (data) {
                $('#form-preset').trigger("reset");
                $('#form-preset input[type="checkbox"]').removeAttr('checked');
                $('#presetName').val(data.name);
                $('#s-creator').val(data.fields.creator);
                $('#s-logo').val(data.fields.logo);
                $('#s-pkname').val(data.fields.pkname);
                $('#s-pkheader').val(data.fields.pkheader);
                if (data.fields.pksheets == "1") $('#s-pksheets').attr('checked', 'checked');
                $('#s-p1kname').val(data.fields.p1name);
                $('#s-p1header').val(data.fields.p1header);
                if (data.fields.p1sheets == "1") $('#s-p1sheets').attr('checked', 'checked');
                if (data.fields.p1active == "1") $('#s-p1active').attr('checked', 'checked');
                $('#s-p5kname').val(data.fields.p5name);
                $('#s-p5header').val(data.fields.p5header);
                if (data.fields.p5sheets == "1") $('#s-p5sheets').attr('checked', 'checked');
                if (data.fields.p5active == "1") $('#s-p5active').attr('checked', 'checked');
                if (data.fields.grouped == "1") $('#s-grouped').attr('checked', 'checked');
                if (data.fields.groupedhide == "1") $('#s-groupedhide').attr('checked', 'checked');
                formLoaderStop();
                presetsUpdate();
                updateMiscImages();
                $('#createPreset').modal('show');
                updateUIPresets(data.presets);
            },
            error: jsError
        });
    });

    $(document).on('click', '.preset-item .action-delete', function (e) {
        e.preventDefault();
        var id = $(this).data('id');
        swal({
            title: "Вы уверены?",
            text: "Это действие необратимо. Удалить пресет?",
            type: "warning",
            closeOnConfirm: false,
            confirmButtonColor: "#2CA8FF",
            confirmButtonText: "Удалить",
            showLoaderOnConfirm: true,
            showCancelButton: true,
            cancelButtonText: "Отмена",
        }, function (isConfirm) {
            if (!isConfirm) return;
            $.ajax({
                url: apiUrl + 'groups/' + id + '/delete',
                type: "POST",
                dataType: 'json',
                data: {token: token},
                success: function (data) {
                    swal({
                        title: "Успех",
                        text: data.message,
                        type: "success",
                        confirmButtonColor: "#2CA8FF",
                    }, function () {
                        presetsUpdate();
                    });
                    updateUIPresets(data.presets);
                },
                error: jsError
            });
        });

    });

    $(document).on('change', '#preset-select', function (e) {
        e.preventDefault();
        formLoaderStart();
        var id = $(this).val();
        $.ajax({
            url: apiUrl + 'groups/' + id + '/select',
            type: "POST",
            dataType: 'json',
            data: {token: token},
            success: function (data) {
                updateUIPresets(data.presets);
                viewPage(appPageCurrent);
            },
            error: jsError
        });
    });

});



function pricesInit() {
    pricesUpdate();
}

function pricesUpdate() {
    console.log(apiUrl + 'prices');
    $.ajax({
        url: apiUrl + 'prices',
        method: "GET",
        dataType: 'json',
        data: {token: token},
        success: function (data) {
            var html = '';
            if (data.count < 1) {
                $('#no-prices').show(0);
            } else {
                $('#no-prices').hide(0);
            }
            $.each(data.items, function (k, price) {
                html += '<div class="col-sm-6"><div class="card price-item" data-id="' + price.id + '">';
                html += '<h3>' + price.name + '</h3><div class="row"><div class="col-sm-6">';
                html += '<p>Изменён: <code>' + moment.unix(price.updated, 'time').format('HH:mm DD.MM.YYYY') + '</code> версия <code>' + price.revision + '</code></p>';
                html += '</div><div class="col-sm-6 h-dr h-mc actions-prices">';
                html += '<button class="btn btn-info btn-icon  btn-icon-mini btn-round action-add" data-id="' + price.id + '"><i class="fa fa-plus"></i></button>';
                html += '<button class="btn btn-info btn-icon  btn-icon-mini btn-round action-edit" data-id="' + price.id + '"><i class="fa fa-pencil"></i></button>';
                html += '<button class="btn btn-danger btn-icon  btn-icon-mini btn-round action-delete" data-id="' + price.id + '"><i class="fa fa-trash"></i></button>';
                html += '</div><div class="prices-sources">';
                $.each(price.sources, function (kk, source) {
                    html += '<div class="price-source row"><div class="col-md-6">';
                    if (source.type == 'cloud') {
                        html += '<i class="fa fa-cloud"></i> ';
                    } else if (source.type == 'link') {
                        html += '<i class="fa fa-link"></i> ';
                    }

                    html += '<code>' + source.source + '</code></div><div class="col-sm-6 h-dr h-mc actions-prices-sources">';
                    html += '<button class="btn btn-info btn-icon  btn-icon-mini btn-round action-edit" data-id="' + source.id + '"><i class="fa fa-pencil"></i></button>';
                    html += '<button class="btn btn-danger btn-icon  btn-icon-mini btn-round action-delete" data-id="' + source.id + '"><i class="fa fa-trash"></i></button>'
                    html += '</div></div>';
                });
                html += '</div></div></div></div></div></div>';
            });

            $('#prices-items').html(html);
            formLoaderStop();
            updateUIPresets(data.presets);
        },
        error: jsError
    });
}


function updatePriceTypeSelect() {
    if ($('#priceType').val() == 'cloud') {
        $('.priceSelectCloudFile').show(0);
    } else {
        $('.priceSelectCloudFile').hide(0);
    }
}

$(function () {
    $(document).on('click', '.price-group-create', function (e) {
        e.preventDefault();
        $('#form-price-group').data('id', 'new');
        $('#createPriceGroup').modal('show');
    });

    $(document).on('submit', '#form-price-group', function (e) {
        e.preventDefault();
        formLoaderStart();
        var id = $(this).data('id');


        var data = $(this).serialize() + "&token=" + token;
        var url = apiUrl + 'prices';

        if (id != 'new') {
            url += '/' + id;
        }
        $.ajax({
            url: url,
            method: "POST",
            dataType: 'json',
            data: data,
            success: function (data) {
                $('#form-price-group').trigger("reset");
                $('#createPriceGroup').modal('hide');
                toastr.success(data.message, 'Успех');
                pricesUpdate();
                updateUIPresets(data.presets);
            },
            error: jsError
        });

    });

    $(document).on('click', '.actions-prices .action-edit', function (e) {
        e.preventDefault();
        var id = $(this).data('id');
        $('#form-price-group').data('id', id);
        $.ajax({
            url: apiUrl + 'prices/' + id,
            method: "GET",
            dataType: 'json',
            data: {token: token},
            success: function (data) {
                $('#form-price-group').trigger("reset");
                $('#form-price-group input[type="checkbox"]').removeAttr('checked');
                $('#priceGroupName').val(data.name);
                if (data.checkDouble) $('#priceGroupCheckDouble').attr('checked', 'checked');
                formLoaderStop();
                $('#createPriceGroup').modal('show');
                updateUIPresets(data.presets);
            },
            error: jsError
        });

    });

    $(document).on('click', '.priceSelectCloudFile', function (e) {
        e.preventDefault();
        fileManagerOpen(fs.prices, ['txt'], function (resp) {
            if (!resp) {
                //$('#pricePath').val('');
            } else {
                $('#pricePath').val(resp.path);
            }
        });
    });


    $(document).on('change', '#priceType', updatePriceTypeSelect);

    $(document).on('click', '.actions-prices .action-add', function (e) {
        e.preventDefault();
        var id = $(this).data('id');
        $('#form-price').data('id', 'new');
        $('#priceParent').val(id);
        updatePriceTypeSelect();
        $('#createPrice').modal('show');
    });


    $(document).on('submit', '#form-price', function (e) {
        e.preventDefault();
        var id = $(this).data('id');
        var url = apiUrl + 'pricesSources';
        if (id != 'new') {
            url += '/' + id;
        }
        var data = $(this).serialize() + "&token=" + token;
        $.ajax({
            url: url,
            method: "POST",
            dataType: 'json',
            data: data,
            success: function (data) {
                $('#form-price').trigger("reset");
                $('#form-price input[type="checkbox"]').removeAttr('checked');
                $('#createPrice').modal('hide');
                toastr.success(data.message, 'Успех');
                pricesUpdate();
                updateUIPresets(data.presets);
            },
            error: jsError
        });

    });

    $(document).on('click', '.actions-prices-sources .action-edit', function (e) {
        e.preventDefault();
        var id = $(this).data('id');
        $('#form-price').data('id', id);
        $.ajax({
            url: apiUrl + 'pricesSources/' + id,
            method: "GET",
            dataType: 'json',
            data: {token: token},
            success: function (data) {
                $('#form-price').trigger("reset");
                $('#form-price input[type="checkbox"]').removeAttr('checked');
                $('#pricePath').val(data.source);
                $('#priceType').val(data.type);
                updatePriceTypeSelect();
                if (data.lastBox) $('#priceLastBox').attr('checked', 'checked');
                formLoaderStop();
                $('#createPrice').modal('show');
                updateUIPresets(data.presets);
            },
            error: jsError
        });
    });


    $(document).on('click', '.actions-prices-sources .action-delete', function (e) {
        e.preventDefault();
        var id = $(this).data('id');
        swal({
            title: "Вы уверены?",
            text: "Это действие необратимо. Удалить источник?",
            type: "warning",
            closeOnConfirm: false,
            confirmButtonColor: "#2CA8FF",
            confirmButtonText: "Удалить",
            showLoaderOnConfirm: true,
            showCancelButton: true,
            cancelButtonText: "Отмена",
        }, function (isConfirm) {
            if (!isConfirm) return;
            $.ajax({
                url: apiUrl + 'pricesSources/' + id + '/delete',
                type: "POST",
                dataType: 'json',
                data: {token: token},
                success: function (data) {
                    swal({
                        title: "Успех",
                        text: data.message,
                        type: "success",
                        confirmButtonColor: "#2CA8FF",
                    }, function () {
                        pricesUpdate();
                    });
                    updateUIPresets(data.presets);
                },
                error: jsError
            });
        });
    });


    $(document).on('click', '.actions-prices .action-delete', function (e) {
        e.preventDefault();
        var id = $(this).data('id');
        swal({
            title: "Вы уверены?",
            text: "Это действие необратимо. Удалить прайс и все его источники?",
            type: "warning",
            closeOnConfirm: false,
            confirmButtonColor: "#2CA8FF",
            confirmButtonText: "Удалить",
            showLoaderOnConfirm: true,
            showCancelButton: true,
            cancelButtonText: "Отмена",
        }, function (isConfirm) {
            if (!isConfirm) return;
            $.ajax({
                url: apiUrl + 'prices/' + id + '/delete',
                type: "POST",
                dataType: 'json',
                data: {token: token},
                success: function (data) {
                    swal({
                        title: "Успех",
                        text: data.message,
                        type: "success",
                        confirmButtonColor: "#2CA8FF",
                    }, function () {
                        pricesUpdate();
                    });
                    updateUIPresets(data.presets);
                },
                error: jsError
            });
        });
    });

});

var appPageCurrent = 'main';
var topped = false;

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
    appPageCurrent = pageName;
    if (pageName == 'presets') {
        presetsInit();
    } else if (pageName == 'categories') {
        //categoriesInit();
    } else if (pageName == 'prices') {
        pricesInit();
    } else if (pageName == 'groups') {
        groupsInit();
    }
}

function formLoaderStart() {
    $('#form-loader').show(0);
}

function formLoaderStop() {
    $('#form-loader').hide(0);
}

var miscImages = [];

function updateMiscImages() {
    $.ajax({

        url: apiUrl + 'images/misc',
        method: "GET",
        dataType: 'json',
        data: {token: token},
        success: function (data) {
            miscImages = data;

            $('input.miscimage').each(function () {
                var randId = makeid();
                $(this).selectize({
                    options: data,
                    maxItems: 1,
                    labelField: 'name',
                    valueField: 'path',
                    searchField: ['name'],
                    render: {
                        option: function (item, escape) {
                            return '<div class="misc-image-item">' +
                                '<img src="' + escape(item.url) + '" alt="">' +
                                '<span class="name">' + escape(item.name) + '</span>' +
                                '</div>';
                        }
                    },
                });
            });

        },
        error: jsError
    });
}


function resetMiscImages() {
    var $miscimage = $('input.miscimage');
    $miscimage.each(function (idx) {

        if ($('input.miscimage').selectize) {
            try {
                $(this).selectize()[0].selectize.destroy();
            } catch (e) {

            }
        }
    });
    $miscimage.removeClass('selectized').show(0);
    $('div.miscimage').remove();
}

window.addEventListener('popstate', function (e) {
    console.log(window.location.pathname.substr(1));
    viewPage(window.location.pathname.substr(1), true);
    return false;
});

function updateUIPresets(presets) {
    _selectHtml = '';
    console.log(presets);
    if (presets.count < 1) {
        if(appPageCurrent !== 'presets') {
            viewPage('presets');
        }
    } else {
        $.each(presets.items, function (k, preset) {
            _selectHtml += '<option value="'+ preset.id + '" ' + (preset.active ? 'selected' : '') + '>' + preset.name + '</option>';
        });
    }
    $('#preset-select').html(_selectHtml);
}

function launch() {
    $.ajax({
        url: apiUrl + 'user/me',
        method: "GET",
        dataType: 'json',
        data: {token: token},
        success: function (data) {
            console.log(data);
            localStorage.setItem("token", token);
            $('.data-account-name').text(data.name);
            updateUIPresets(data.presets);
            viewPage(appPageCurrent == 'login' ? 'main' : appPageCurrent);

            hidePreloader();
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
    syncScroll();


    PullToRefresh.init({
        mainElement: '#c', // above which element?
        passive: false,
        shouldPullToRefresh: function(){
            return !$('body').hasClass('modal-open') && topped;
        },
        onRefresh: function (done) {
            viewPage(appPageCurrent)
            setTimeout(function () {
                done(); // end pull to refresh
            }, 1500);
        }
    });



});

function syncScroll() {
    var scrolled = window.pageYOffset || document.documentElement.scrollTop;
    var _oldTopped = topped;
    if (scrolled >= 63) {
        topped = false;
    } else {
        topped = true;
    }
    if (topped != _oldTopped) {
        if (topped) {
            $('body').addClass('topped');
        } else {
            $('body').removeClass('topped');
        }
    }
}

window.onscroll = function () {
    syncScroll();


};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUuanMiLCJlcnJvcnMuanMiLCJmcy5qcyIsImdyb3Vwcy5qcyIsImhlbHBlcnMuanMiLCJwcmVzZXRzLmpzIiwicHJpY2VzLmpzIiwidWkuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hUQTtBQUNBO0FBQ0E7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzVRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IHZlcnNpb24gPSAnMy4wLjAgQWxwaGEnO1xyXG5cclxudmFyIHNlcnZlclZlcnNpb24gPSAndW5rbm93bic7XHJcbnZhciBhcGlVcmwgPSBmYWxzZTtcclxudmFyIHRva2VuID0gJyc7XHJcblxyXG5cclxuXHJcbmZ1bmN0aW9uIHN1cHBvcnRTdG9yYWdlKCkge1xyXG4gICAgdHJ5IHtcclxuICAgICAgICByZXR1cm4gJ2xvY2FsU3RvcmFnZScgaW4gd2luZG93ICYmIHdpbmRvd1snbG9jYWxTdG9yYWdlJ10gIT09IG51bGw7XHJcbiAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBpbml0KCkge1xyXG5cclxuICAgICQoJy5wYWdlJykuaGlkZSgwKTtcclxuXHJcbiAgICBpZiAoIXN1cHBvcnRTdG9yYWdlKCkpIHtcclxuICAgICAgICBhbGVydCgn0KHQutCw0YfQsNC5INC90L7RgNC80LDQu9GM0L3Ri9C5INCx0YDQsNGD0LfQtdGALCDQtNC40L3QvtC30LDQstGAIScpO1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICB0b2tlbiA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCd0b2tlbicpO1xyXG5cclxuICAgICQuYWpheCh7XHJcbiAgICAgICAgdXJsOiBJTklUX1VSTCxcclxuICAgICAgICBtZXRob2Q6IFwiR0VUXCIsXHJcbiAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcclxuICAgICAgICBkYXRhOiB7dG9rZW46IHRva2VufSxcclxuICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInN1Y2Nlc3NmdWxseSBydW4gYWpheCByZXF1ZXN0Li4uXCIsIGRhdGEpO1xyXG4gICAgICAgICAgICBzZXJ2ZXJWZXJzaW9uID0gZGF0YS52ZXJzaW9uO1xyXG4gICAgICAgICAgICBhcGlVcmwgPSBkYXRhLmFwaVVybDtcclxuICAgICAgICAgICAgZnMgPSBkYXRhLmZzO1xyXG4gICAgICAgICAgICAkKCcuZGF0YS1zZXJ2ZXItdmVyc2lvbicpLnRleHQoc2VydmVyVmVyc2lvbik7XHJcbiAgICAgICAgICAgICQoJy5kYXRhLXZlcnNpb24nKS50ZXh0KHZlcnNpb24pO1xyXG4gICAgICAgICAgICBpZiAoZGF0YS5pc0d1ZXN0KSB7XHJcbiAgICAgICAgICAgICAgICAvLyDQs9C+0YHRgtGMXHJcbiAgICAgICAgICAgICAgICB2aWV3UGFnZSgnbG9naW4nKTtcclxuICAgICAgICAgICAgICAgIGhpZGVQcmVsb2FkZXIoKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGxhdW5jaCgpO1xyXG4gICAgICAgICAgICAgICAgaGlkZVByZWxvYWRlcigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICBlcnJvcjoganNFcnJvclxyXG4gICAgfSk7XHJcblxyXG59XHJcblxyXG5cclxuXHJcbiQoZnVuY3Rpb24gKCkge1xyXG4gICAgaW5pdCgpO1xyXG59KTsiLCJ2YXIganNFcnJvciA9IGZ1bmN0aW9uKGRhdGEpXHJcbntcclxuICAgIHRvYXN0ci5lcnJvcihkYXRhLnJlc3BvbnNlSlNPTi5lcnJvci5tZXNzYWdlLCAn0J7RiNC40LHQutCwJylcclxuICAgIGNvbnNvbGUuZXJyb3IoZGF0YSk7XHJcbiAgICBpZiAoZGF0YS5zdGF0dXMgPT0gNDAzKSB7XHJcbiAgICAgICAgY29uc29sZS53YXJuaW5nKCd1bmF1dGhvcml6ZWQnKTtcclxuICAgICAgICAvL3ZpZXdQYWdlKCdsb2dpbicsIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zdWJzdHIoMSkpO1xyXG4gICAgfVxyXG4gICAgZm9ybUxvYWRlclN0b3AoKTtcclxufSIsInZhciBmaWxlbWFuYWdlciwgYnJlYWRjcnVtYnMsIGZpbGVMaXN0O1xyXG52YXIgZmlsZW1hbmFnZXJDdXJyZW50RGlyID0gJy8nO1xyXG52YXIgZmlsZW1hbmFnZXJDdXJyZW50VHlwZXMgPSBbXTtcclxudmFyIGZpbGVtYW5hZ2VyU3RhcnREaXIgPSAnLyc7XHJcbnZhciBkZWZhdWx0RmlsZW1hbmFnZXJDYWxsQmFjayA9IGZ1bmN0aW9uIChwYXRoKSB7XHJcbiAgICBjb25zb2xlLmxvZygnZm0gZGVmYXVsdCBjYWxsYmFjaycsIHBhdGgpXHJcbn07XHJcbnZhciBmaWxlbWFuYWdlckNhbGxiYWNrO1xyXG5cclxuXHJcbmZ1bmN0aW9uIGZpbGVNYW5hZ2VyTG9hZGVyU3RhcnQoKSB7XHJcbiAgICAkKCcuZmlsZW1hbmFnZXIgLmxvYWRlcicpLnNob3coMCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZpbGVNYW5hZ2VyTG9hZGVyU3RvcCgpIHtcclxuICAgICQoJy5maWxlbWFuYWdlciAubG9hZGVyJykuaGlkZSgwKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZnNMcyhkaXIpIHtcclxuICAgIGZpbGVNYW5hZ2VyTG9hZGVyU3RhcnQoKTtcclxuICAgIGZpbGVMaXN0LnJlbW92ZUNsYXNzKCdhbmltYXRlZCcpO1xyXG4gICAgZmlsZUxpc3QuY3NzKHsnZGlzcGxheSc6ICdub25lJ30pO1xyXG4gICAgJC5hamF4KHtcclxuICAgICAgICB1cmw6IGFwaVVybCArICdmcy9scycsXHJcbiAgICAgICAgdHlwZTogXCJHRVRcIixcclxuICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxyXG4gICAgICAgIGRhdGE6IHt0b2tlbjogdG9rZW4sIHBhdGg6IGRpcn0sXHJcbiAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgZmlsZW1hbmFnZXJDdXJyZW50RGlyID0gZGF0YS5wYXRoO1xyXG4gICAgICAgICAgICBmaWxlbWFuYWdlci5maW5kKCcucGF0aCcpLnRleHQoZmlsZW1hbmFnZXJDdXJyZW50RGlyKTtcclxuICAgICAgICAgICAgZmlsZU1hbmFnZXJSZW5kZXIoZGF0YS5pdGVtcyk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBlcnJvcjoganNFcnJvclxyXG4gICAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZzTWQobmV3RGlyLCBkaXIpIHtcclxuICAgIGZpbGVMaXN0LnJlbW92ZUNsYXNzKCdhbmltYXRlZCcpO1xyXG4gICAgZmlsZUxpc3QuY3NzKHsnZGlzcGxheSc6ICdub25lJ30pO1xyXG4gICAgJC5hamF4KHtcclxuICAgICAgICB1cmw6IGFwaVVybCArICdmcy9tZCcsXHJcbiAgICAgICAgdHlwZTogXCJHRVRcIixcclxuICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxyXG4gICAgICAgIGRhdGE6IHt0b2tlbjogdG9rZW4sIHBhdGg6IGRpciwgbmFtZTogbmV3RGlyfSxcclxuICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICBmaWxlbWFuYWdlckN1cnJlbnREaXIgPSBkYXRhLnBhdGg7XHJcbiAgICAgICAgICAgIGZzTHMoZmlsZW1hbmFnZXJDdXJyZW50RGlyKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGVycm9yOiBqc0Vycm9yXHJcbiAgICB9KTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGZpbGVNYW5hZ2VyT3BlbihkaXIsIHR5cGVzLCBjYWxsYmFjaykge1xyXG4gICAgZmlsZW1hbmFnZXJTdGFydERpciA9IGRpciA/IGRpciA6ICcvJztcclxuICAgIGZpbGVtYW5hZ2VyQ2FsbGJhY2sgPSBjYWxsYmFjayA/IGNhbGxiYWNrIDogZGVmYXVsdEZpbGVtYW5hZ2VyQ2FsbEJhY2s7XHJcbiAgICBmaWxlbWFuYWdlckN1cnJlbnRUeXBlcyA9IHR5cGVzID8gdHlwZXMgOiBbXTtcclxuICAgIGZpbGVtYW5hZ2VyLmNzcygnZGlzcGxheScsICdibG9jaycpO1xyXG4gICAgZnNMcyhkaXIpXHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBlc2NhcGVIVE1MKHRleHQpIHtcclxuICAgIHJldHVybiB0ZXh0LnJlcGxhY2UoL1xcJi9nLCAnJmFtcDsnKS5yZXBsYWNlKC9cXDwvZywgJyZsdDsnKS5yZXBsYWNlKC9cXD4vZywgJyZndDsnKTtcclxufVxyXG5cclxuXHJcbi8vIENvbnZlcnQgZmlsZSBzaXplcyBmcm9tIGJ5dGVzIHRvIGh1bWFuIHJlYWRhYmxlIHVuaXRzXHJcblxyXG5mdW5jdGlvbiBieXRlc1RvU2l6ZShieXRlcykge1xyXG4gICAgdmFyIHNpemVzID0gWyfQsdCw0LnRgicsICfQutCxJywgJ9C80LEnLCAn0LPQsScsICfRgtCxJ107XHJcbiAgICBpZiAoYnl0ZXMgPT0gMCkgcmV0dXJuICfQv9GD0YHRgtC+0LknO1xyXG4gICAgdmFyIGkgPSBwYXJzZUludChNYXRoLmZsb29yKE1hdGgubG9nKGJ5dGVzKSAvIE1hdGgubG9nKDEwMjQpKSk7XHJcbiAgICByZXR1cm4gTWF0aC5yb3VuZChieXRlcyAvIE1hdGgucG93KDEwMjQsIGkpLCAyKSArICcgJyArIHNpemVzW2ldO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gZmlsZU1hbmFnZXJSZW5kZXIoZGF0YSkge1xyXG5cclxuICAgIHZhciBzY2FubmVkRm9sZGVycyA9IFtdLFxyXG4gICAgICAgIHNjYW5uZWRGaWxlcyA9IFtdO1xyXG5cclxuICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XHJcblxyXG4gICAgICAgIGRhdGEuZm9yRWFjaChmdW5jdGlvbiAoZCkge1xyXG5cclxuICAgICAgICAgICAgaWYgKGQudHlwZSA9PT0gJ2ZvbGRlcicpIHtcclxuICAgICAgICAgICAgICAgIHNjYW5uZWRGb2xkZXJzLnB1c2goZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZiAoZC50eXBlID09PSAnZmlsZScpIHtcclxuICAgICAgICAgICAgICAgIHNjYW5uZWRGaWxlcy5wdXNoKGQpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHR5cGVvZiBkYXRhID09PSAnb2JqZWN0Jykge1xyXG5cclxuICAgICAgICBzY2FubmVkRm9sZGVycyA9IGRhdGEuZm9sZGVycztcclxuICAgICAgICBzY2FubmVkRmlsZXMgPSBkYXRhLmZpbGVzO1xyXG5cclxuICAgIH1cclxuXHJcblxyXG4gICAgLy8gRW1wdHkgdGhlIG9sZCByZXN1bHQgYW5kIG1ha2UgdGhlIG5ldyBvbmVcclxuXHJcbiAgICBmaWxlTGlzdC5lbXB0eSgpLmhpZGUoKTtcclxuXHJcbiAgICBpZiAoIXNjYW5uZWRGb2xkZXJzLmxlbmd0aCAmJiAhc2Nhbm5lZEZpbGVzLmxlbmd0aCkge1xyXG4gICAgICAgIGZpbGVtYW5hZ2VyLmZpbmQoJy5ub3RoaW5nZm91bmQnKS5zaG93KCk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBmaWxlbWFuYWdlci5maW5kKCcubm90aGluZ2ZvdW5kJykuaGlkZSgpO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBpZiAoc2Nhbm5lZEZvbGRlcnMubGVuZ3RoKSB7XHJcblxyXG4gICAgICAgIHNjYW5uZWRGb2xkZXJzLmZvckVhY2goZnVuY3Rpb24gKGYpIHtcclxuXHJcbiAgICAgICAgICAgIHZhciBuYW1lID0gZXNjYXBlSFRNTChmLm5hbWUpLFxyXG4gICAgICAgICAgICAgICAgaWNvbiA9ICc8c3BhbiBjbGFzcz1cImljb24gZm9sZGVyXCI+PC9zcGFuPic7XHJcblxyXG4gICAgICAgICAgICB2YXIgZm9sZGVyID0gJCgnPGxpIGNsYXNzPVwiZm9sZGVyc1wiPjxhIGhyZWY9XCInICsgZi5wYXRoICsgJ1wiIHRpdGxlPVwiJyArIGYucGF0aCArICdcIiBjbGFzcz1cImZvbGRlcnNcIj4nICsgaWNvbiArICc8c3BhbiBjbGFzcz1cIm5hbWVcIj4nICsgbmFtZSArICc8L3NwYW4+PC9hPjwvbGk+Jyk7XHJcbiAgICAgICAgICAgIGZvbGRlci5hcHBlbmRUbyhmaWxlTGlzdCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGlmIChzY2FubmVkRmlsZXMubGVuZ3RoKSB7XHJcblxyXG4gICAgICAgIHNjYW5uZWRGaWxlcy5mb3JFYWNoKGZ1bmN0aW9uIChmKSB7XHJcblxyXG4gICAgICAgICAgICB2YXIgZmlsZVNpemUgPSBieXRlc1RvU2l6ZShmLnNpemUpLFxyXG4gICAgICAgICAgICAgICAgbmFtZSA9IGVzY2FwZUhUTUwoZi5uYW1lKSxcclxuICAgICAgICAgICAgICAgIGZpbGVUeXBlID0gbmFtZS5zcGxpdCgnLicpLFxyXG4gICAgICAgICAgICAgICAgaWNvbiA9ICc8c3BhbiBjbGFzcz1cImljb24gZmlsZVwiPjwvc3Bhbj4nO1xyXG4gICAgICAgICAgICBmaWxlVHlwZSA9IGZpbGVUeXBlW2ZpbGVUeXBlLmxlbmd0aCAtIDFdO1xyXG4gICAgICAgICAgICBpZiAoIWZpbGVtYW5hZ2VyQ3VycmVudFR5cGVzLmxlbmd0aCB8fCBmaWxlbWFuYWdlckN1cnJlbnRUeXBlcy5qb2luKCcsJykuaW5kZXhPZihmaWxlVHlwZSkgPj0gMCkge1xyXG4gICAgICAgICAgICAgICAgaWNvbiA9ICc8c3BhbiBjbGFzcz1cImljb24gZmlsZSBmLScgKyBmaWxlVHlwZSArICdcIj4uJyArIGZpbGVUeXBlICsgJzwvc3Bhbj4nO1xyXG5cclxuICAgICAgICAgICAgICAgIHZhciBmaWxlID0gJCgnPGxpIGNsYXNzPVwiZmlsZXNcIj48YSBocmVmPVwiJyArIGYucGF0aCArICdcIiB0aXRsZT1cIicgKyBmLnBhdGggKyAnXCIgY2xhc3M9XCJmaWxlc1wiPicgKyBpY29uICsgJzxzcGFuIGNsYXNzPVwibmFtZVwiPicgKyBuYW1lICsgJzwvc3Bhbj4gPHNwYW4gY2xhc3M9XCJkZXRhaWxzXCI+JyArIGZpbGVTaXplICsgJzwvc3Bhbj48L2E+PC9saT4nKTtcclxuICAgICAgICAgICAgICAgIGZpbGUuYXBwZW5kVG8oZmlsZUxpc3QpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfVxyXG5cclxuXHJcbiAgICAvLyBHZW5lcmF0ZSB0aGUgYnJlYWRjcnVtYnNcclxuICAgIGZpbGVNYW5hZ2VyTG9hZGVyU3RvcCgpO1xyXG5cclxuICAgIGlmIChmaWxlbWFuYWdlci5oYXNDbGFzcygnc2VhcmNoaW5nJykpIHtcclxuXHJcbiAgICAgICAgZmlsZUxpc3QucmVtb3ZlQ2xhc3MoJ2FuaW1hdGVkJyk7XHJcblxyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcblxyXG4gICAgICAgIGZpbGVMaXN0LmFkZENsYXNzKCdhbmltYXRlZCcpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBmaWxlTGlzdC5jc3MoeydkaXNwbGF5JzogJ2lubGluZS1ibG9jayd9KTtcclxuXHJcbn1cclxuXHJcblxyXG4kKGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnLmZpbGVtYW5hZ2VyIC5hY3Rpb25zIGJ1dHRvbi5hY3Rpb24tcmVmcmVzaCcsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIGZzTHMoZmlsZW1hbmFnZXJDdXJyZW50RGlyKTtcclxuICAgIH0pO1xyXG5cclxuICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcuZmlsZW1hbmFnZXIgLmFjdGlvbnMgYnV0dG9uLmFjdGlvbi1iYWNrJywgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coZmlsZW1hbmFnZXJTdGFydERpciwgZmlsZW1hbmFnZXJDdXJyZW50RGlyKTtcclxuICAgICAgICBpZiAoZmlsZW1hbmFnZXJTdGFydERpci5yZXBsYWNlKC9eXFwvfFxcLyQvZywgJycpID09IGZpbGVtYW5hZ2VyQ3VycmVudERpci5yZXBsYWNlKC9eXFwvfFxcLyQvZywgJycpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHBhdGggPSBmaWxlbWFuYWdlckN1cnJlbnREaXIuc3BsaXQoJy8nKTtcclxuICAgICAgICBwYXRoLnBvcCgpO1xyXG4gICAgICAgIHBhdGggPSBwYXRoLmpvaW4oJy8nKTtcclxuICAgICAgICBmc0xzKHBhdGgpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJy5maWxlbWFuYWdlciAuYWN0aW9ucyBidXR0b24uYWN0aW9uLWNyZWF0ZScsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgZmlsZU1hbmFnZXJMb2FkZXJTdGFydCgpO1xyXG4gICAgICAgIHZhciBmb2xkZXJOYW1lID0gcHJvbXB0KFwi0J3QsNC30LLQsNC90LjQtSDQvdC+0LLQvtC5INC/0LDQv9C60LhcIiwgXCLQndC+0LLQsNGPINC/0LDQv9C60LBcIik7XHJcbiAgICAgICAgaWYgKGZvbGRlck5hbWUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBmc01kKGZvbGRlck5hbWUsIGZpbGVtYW5hZ2VyQ3VycmVudERpcik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgZmlsZU1hbmFnZXJMb2FkZXJTdG9wKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJy5maWxlbWFuYWdlciAuYWN0aW9ucyBidXR0b24uYWN0aW9uLXVwbG9hZCwgLmZpbGVtYW5hZ2VyIC5ub2ZpbGVzJywgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgJCgnI2ZzLWZpbGUtZmllbGQnKS5jbGljaygpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgJChkb2N1bWVudCkub24oJ2NoYW5nZScsICcjZnMtZmlsZS1maWVsZCcsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIGlmICgkKHRoaXMpLnZhbCgpID09ICcnKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAkKCcjZnMtZmlsZScpLnN1Ym1pdCgpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgICQoZG9jdW1lbnQpLm9uKFwic3VibWl0XCIsICcjZnMtZmlsZScsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgZmlsZU1hbmFnZXJMb2FkZXJTdGFydCgpO1xyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICB2YXIgZm9ybSA9ICQodGhpcyk7XHJcbiAgICAgICAgdmFyIGZvcm1EYXRhID0gbmV3IEZvcm1EYXRhKGZvcm1bMF0pO1xyXG4gICAgICAgIGZvcm1EYXRhLmFwcGVuZCgndG9rZW4nLCB0b2tlbik7XHJcbiAgICAgICAgZm9ybURhdGEuYXBwZW5kKCdwYXRoJywgZmlsZW1hbmFnZXJDdXJyZW50RGlyKTtcclxuICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICB1cmw6IGFwaVVybCArICdmcy9pbicsXHJcbiAgICAgICAgICAgIHR5cGU6IFwiUE9TVFwiLFxyXG4gICAgICAgICAgICBwcm9jZXNzRGF0YTogZmFsc2UsXHJcbiAgICAgICAgICAgIGNvbnRlbnRUeXBlOiBmYWxzZSxcclxuICAgICAgICAgICAgZGF0YTogZm9ybURhdGEsXHJcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChyZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgIGZzTHMocmVzdWx0LnBhdGgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBlcnJvcjoganNFcnJvclxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgZmlsZW1hbmFnZXIgPSAkKCcuZmlsZW1hbmFnZXInKTtcclxuICAgIGJyZWFkY3J1bWJzID0gJCgnLmJyZWFkY3J1bWJzJyk7XHJcbiAgICBmaWxlTGlzdCA9IGZpbGVtYW5hZ2VyLmZpbmQoJy5kYXRhJyk7XHJcblxyXG5cclxuICAgIC8vIENsaWNraW5nIG9uIGZvbGRlcnNcclxuXHJcbiAgICBmaWxlTGlzdC5vbignY2xpY2snLCAnbGkuZm9sZGVycycsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAgICAgICB2YXIgbmV4dERpciA9ICQodGhpcykuZmluZCgnYS5mb2xkZXJzJykuYXR0cignaHJlZicpO1xyXG5cclxuICAgICAgICBmc0xzKG5leHREaXIpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgdmFyIHRtZDtcclxuXHJcbiAgICAvLyDQlNC+0LHQsNCy0LvRj9C10Lwg0LrQu9Cw0YHRgSBob3ZlciDQv9GA0Lgg0L3QsNCy0LXQtNC10L3QuNC4XHJcbiAgICBmaWxlbWFuYWdlci5vbignZHJhZ292ZXInLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRtZCk7XHJcbiAgICAgICAgJCgnYm9keScpLmFkZENsYXNzKCdkcm9wJyk7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8g0KPQsdC40YDQsNC10Lwg0LrQu9Cw0YHRgSBob3ZlclxyXG4gICAgZmlsZW1hbmFnZXIub24oJ2RyYWdsZWF2ZScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBjbGVhclRpbWVvdXQodG1kKTtcclxuICAgICAgICB0bWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgJCgnYm9keScpLnJlbW92ZUNsYXNzKCdkcm9wJyk7XHJcbiAgICAgICAgfSwgNjAwKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8g0J7QsdGA0LDQsdCw0YLRi9Cy0LDQtdC8INGB0L7QsdGL0YLQuNC1IERyb3BcclxuICAgICQoJ2JvZHknKVswXS5vbmRyb3AgPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICQoJ2JvZHknKS5yZW1vdmVDbGFzcygnZHJvcCcpO1xyXG4gICAgICAgIC8vIGRyb3Bab25lLnJlbW92ZUNsYXNzKCdob3ZlcicpO1xyXG4gICAgICAgIC8vIGRyb3Bab25lLmFkZENsYXNzKCdkcm9wJyk7XHJcbiAgICAgICAgLy9cclxuXHJcbiAgICAgICAgY29uc29sZS5sb2coZXZlbnQuZGF0YVRyYW5zZmVyKTtcclxuICAgICAgICB2YXIgZmlsZSA9IGV2ZW50LmRhdGFUcmFuc2Zlci5maWxlc1swXTtcclxuICAgICAgICBmaWxlTWFuYWdlckxvYWRlclN0YXJ0KCk7XHJcbiAgICAgICAgdmFyIGZvcm0gPSAkKHRoaXMpO1xyXG4gICAgICAgIHZhciBmb3JtRGF0YSA9IG5ldyBGb3JtRGF0YShmb3JtWzBdKTtcclxuICAgICAgICBmb3JtRGF0YS5hcHBlbmQoJ3Rva2VuJywgdG9rZW4pO1xyXG4gICAgICAgIGZvcm1EYXRhLmFwcGVuZCgnZmlsZScsIGZpbGUpO1xyXG4gICAgICAgIGZvcm1EYXRhLmFwcGVuZCgncGF0aCcsIGZpbGVtYW5hZ2VyQ3VycmVudERpcik7XHJcbiAgICAgICAgJC5hamF4KHtcclxuICAgICAgICAgICAgdXJsOiBhcGlVcmwgKyAnZnMvaW4nLFxyXG4gICAgICAgICAgICB0eXBlOiBcIlBPU1RcIixcclxuICAgICAgICAgICAgcHJvY2Vzc0RhdGE6IGZhbHNlLFxyXG4gICAgICAgICAgICBjb250ZW50VHlwZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGRhdGE6IGZvcm1EYXRhLFxyXG4gICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAocmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICBmc0xzKHJlc3VsdC5wYXRoKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZXJyb3I6IGpzRXJyb3JcclxuICAgICAgICB9KTtcclxuICAgIH07XHJcblxyXG4gICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJy5maWxlbWFuYWdlciBhLmZpbGVzJywgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgZmlsZW1hbmFnZXIuY3NzKCdkaXNwbGF5JywgJ25vbmUnKTtcclxuICAgICAgICB2YXIgcmVzcCA9IHt9O1xyXG4gICAgICAgIHJlc3AuZGlyID0gZmlsZW1hbmFnZXJDdXJyZW50RGlyO1xyXG4gICAgICAgIHJlc3AucGF0aCA9ICQodGhpcykucHJvcCgndGl0bGUnKTtcclxuICAgICAgICByZXNwLm5hbWUgPSAkKHRoaXMpLmZpbmQoJy5uYW1lJykudGV4dCgpO1xyXG4gICAgICAgIHJlc3AuZXh0ID0gJCh0aGlzKS5maW5kKCcuZmlsZScpLnRleHQoKTtcclxuICAgICAgICBmaWxlbWFuYWdlckNhbGxiYWNrKHJlc3ApO1xyXG4gICAgfSk7XHJcblxyXG4gICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJy5mbS1jbG9zZScsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIGZpbGVtYW5hZ2VyLmNzcygnZGlzcGxheScsICdub25lJyk7XHJcbiAgICAgICAgZmlsZW1hbmFnZXJDYWxsYmFjayhmYWxzZSk7XHJcbiAgICB9KTtcclxuXHJcbn0pO1xyXG4iLCJmdW5jdGlvbiBncm91cHNJbml0KCl7XHJcblxyXG59IiwiZnVuY3Rpb24gbWFrZWlkKCkge1xyXG4gICAgdmFyIHRleHQgPSBcIlwiO1xyXG4gICAgdmFyIHBvc3NpYmxlID0gXCJBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OVwiO1xyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMTU7IGkrKylcclxuICAgICAgICB0ZXh0ICs9IHBvc3NpYmxlLmNoYXJBdChNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBwb3NzaWJsZS5sZW5ndGgpKTtcclxuXHJcbiAgICByZXR1cm4gdGV4dDtcclxufSIsImZ1bmN0aW9uIHByZXNldHNJbml0KCkge1xyXG4gICAgcHJlc2V0c1VwZGF0ZSgpO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gcHJlc2V0c1VwZGF0ZSgpIHtcclxuICAgICQuYWpheCh7XHJcbiAgICAgICAgdXJsOiBhcGlVcmwgKyAnZ3JvdXBzJyxcclxuICAgICAgICBtZXRob2Q6IFwiR0VUXCIsXHJcbiAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcclxuICAgICAgICBkYXRhOiB7dG9rZW46IHRva2VufSxcclxuICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICB2YXIgaHRtbCA9ICcnO1xyXG4gICAgICAgICAgICBpZiAoZGF0YS5jb3VudC5hbGwgPCAxKSB7XHJcbiAgICAgICAgICAgICAgICAkKCcjbm8tcHJlc2V0cycpLnNob3coMCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAkKCcjbm8tcHJlc2V0cycpLmhpZGUoMCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgJC5lYWNoKGRhdGEuaXRlbXMsIGZ1bmN0aW9uIChrLCB2KSB7XHJcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiY29sLXNtLTZcIj48ZGl2IGNsYXNzPVwiY2FyZCBwcmVzZXQtaXRlbVwiIGRhdGEtaWQ9XCInICsgdi5pZCArICdcIj4nO1xyXG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGgzPicgKyB2Lm5hbWUgKyAnPC9oMz4nO1xyXG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cInJvd1wiPjxkaXYgY2xhc3M9XCJjb2wtc20tNlwiPic7XHJcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8cD7QkNCy0YLQvtGAOiA8Y29kZT4nICsgdi5vd25lci51c2VybmFtZSArICc8L2NvZGU+PC9wPic7XHJcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8cD7QmNC30LzQtdC90ZHQvTogPGNvZGU+JyArIG1vbWVudC51bml4KHYudXBkYXRlZCwgJ3RpbWUnKS5mb3JtYXQoJ0hIOm1tIERELk1NLllZWVknKSArICc8L2NvZGU+PC9wPic7XHJcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8L2Rpdj48ZGl2IGNsYXNzPVwiY29sLXNtLTYgaC1kciBoLW1jIGFjdGlvbnNcIj4nO1xyXG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGJ1dHRvbiBjbGFzcz1cImJ0biBidG4taW5mbyBidG4taWNvbiBidG4taWNvbi1taW5pIGJ0bi1yb3VuZCBhY3Rpb24tZWRpdFwiIGRhdGEtaWQ9XCInICsgdi5pZCArICdcIj48aSBjbGFzcz1cImZhIGZhLXBlbmNpbFwiPjwvaT48L2J1dHRvbj4nO1xyXG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGJ1dHRvbiBjbGFzcz1cImJ0biBidG4taW5mbyBidG4taWNvbiBidG4taWNvbi1taW5pIGJ0bi1yb3VuZCBhY3Rpb24tc2hhcmVcIiBkYXRhLWlkPVwiJyArIHYuaWQgKyAnXCI+PGkgY2xhc3M9XCJmYSBmYS1zaGFyZS1hbHRcIj48L2k+PC9idXR0b24+JztcclxuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxidXR0b24gY2xhc3M9XCJidG4gYnRuLWRhbmdlciBidG4taWNvbiBidG4taWNvbi1taW5pIGJ0bi1yb3VuZCBhY3Rpb24tZGVsZXRlXCIgZGF0YS1pZD1cIicgKyB2LmlkICsgJ1wiPjxpIGNsYXNzPVwiZmEgZmEtdHJhc2hcIj48L2k+PC9idXR0b24+JztcclxuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2PjwvZGl2PjwvZGl2PjwvZGl2Pic7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgJCgnI3ByZXNldHMtaXRlbXMnKS5odG1sKGh0bWwpO1xyXG5cclxuICAgICAgICAgICAgdXBkYXRlVUlQcmVzZXRzKGRhdGEucHJlc2V0cyk7XHJcbiAgICAgICAgICAgIGZvcm1Mb2FkZXJTdG9wKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBlcnJvcjoganNFcnJvclxyXG4gICAgfSk7XHJcbn1cclxuXHJcbiQoZnVuY3Rpb24gKCkge1xyXG4gICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJy5wcmVzZXRzLWNyZWF0ZScsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIHJlc2V0TWlzY0ltYWdlcygpO1xyXG4gICAgICAgIC8vIGNvbnRcclxuICAgICAgICB1cGRhdGVNaXNjSW1hZ2VzKCk7XHJcbiAgICAgICAgJCgnI2Zvcm0tcHJlc2V0JykuZGF0YSgncHJlc2V0JywgJ25ldycpO1xyXG4gICAgICAgICQoJyNjcmVhdGVQcmVzZXQnKS5tb2RhbCgnc2hvdycpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgJChkb2N1bWVudCkub24oJ3N1Ym1pdCcsICcjZm9ybS1wcmVzZXQnLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICBmb3JtTG9hZGVyU3RhcnQoKTtcclxuICAgICAgICB2YXIgZGF0YSA9ICQodGhpcykuc2VyaWFsaXplKCkgKyBcIiZ0b2tlbj1cIiArIHRva2VuO1xyXG4gICAgICAgIHZhciB1cmwgPSBhcGlVcmwgKyAnZ3JvdXBzJztcclxuICAgICAgICBpZiAoJCh0aGlzKS5kYXRhKCdwcmVzZXQnKSAhPSAnbmV3Jykge1xyXG4gICAgICAgICAgICB1cmwgKz0gJy8nICsgJCh0aGlzKS5kYXRhKCdwcmVzZXQnKVxyXG4gICAgICAgIH1cclxuICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICB1cmw6IHVybCxcclxuICAgICAgICAgICAgbWV0aG9kOiBcIlBPU1RcIixcclxuICAgICAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcclxuICAgICAgICAgICAgZGF0YTogZGF0YSxcclxuICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICQoJyNmb3JtLXByZXNldCcpLnRyaWdnZXIoXCJyZXNldFwiKTtcclxuICAgICAgICAgICAgICAgICQoJyNjcmVhdGVQcmVzZXQnKS5tb2RhbCgnaGlkZScpO1xyXG4gICAgICAgICAgICAgICAgdG9hc3RyLnN1Y2Nlc3MoZGF0YS5tZXNzYWdlLCAn0KPRgdC/0LXRhScpO1xyXG4gICAgICAgICAgICAgICAgcHJlc2V0c1VwZGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgdXBkYXRlVUlQcmVzZXRzKGRhdGEucHJlc2V0cyk7XHJcbiAgICAgICAgICAgICAgICAvL2dyb3Vwc1VwZGF0ZU15KHRydWUpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBlcnJvcjoganNFcnJvclxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIC8vJCgnI2NyZWF0ZVByZXNldCcpLm1vZGFsKCdoaWRlJyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnLnByZXNldC1pdGVtIC5hY3Rpb24tZWRpdCcsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIGZvcm1Mb2FkZXJTdGFydCgpO1xyXG4gICAgICAgIHZhciBwcmVzZXRJZCA9ICQodGhpcykuZGF0YSgnaWQnKTtcclxuICAgICAgICAkKCcjZm9ybS1wcmVzZXQnKS5kYXRhKCdwcmVzZXQnLCBwcmVzZXRJZCk7XHJcbiAgICAgICAgcmVzZXRNaXNjSW1hZ2VzKCk7XHJcbiAgICAgICAgJC5hamF4KHtcclxuICAgICAgICAgICAgdXJsOiBhcGlVcmwgKyAnZ3JvdXBzLycgKyBwcmVzZXRJZCxcclxuICAgICAgICAgICAgbWV0aG9kOiBcIkdFVFwiLFxyXG4gICAgICAgICAgICBkYXRhOiB7dG9rZW46IHRva2VufSxcclxuICAgICAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcclxuICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICQoJyNmb3JtLXByZXNldCcpLnRyaWdnZXIoXCJyZXNldFwiKTtcclxuICAgICAgICAgICAgICAgICQoJyNmb3JtLXByZXNldCBpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nKS5yZW1vdmVBdHRyKCdjaGVja2VkJyk7XHJcbiAgICAgICAgICAgICAgICAkKCcjcHJlc2V0TmFtZScpLnZhbChkYXRhLm5hbWUpO1xyXG4gICAgICAgICAgICAgICAgJCgnI3MtY3JlYXRvcicpLnZhbChkYXRhLmZpZWxkcy5jcmVhdG9yKTtcclxuICAgICAgICAgICAgICAgICQoJyNzLWxvZ28nKS52YWwoZGF0YS5maWVsZHMubG9nbyk7XHJcbiAgICAgICAgICAgICAgICAkKCcjcy1wa25hbWUnKS52YWwoZGF0YS5maWVsZHMucGtuYW1lKTtcclxuICAgICAgICAgICAgICAgICQoJyNzLXBraGVhZGVyJykudmFsKGRhdGEuZmllbGRzLnBraGVhZGVyKTtcclxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmZpZWxkcy5wa3NoZWV0cyA9PSBcIjFcIikgJCgnI3MtcGtzaGVldHMnKS5hdHRyKCdjaGVja2VkJywgJ2NoZWNrZWQnKTtcclxuICAgICAgICAgICAgICAgICQoJyNzLXAxa25hbWUnKS52YWwoZGF0YS5maWVsZHMucDFuYW1lKTtcclxuICAgICAgICAgICAgICAgICQoJyNzLXAxaGVhZGVyJykudmFsKGRhdGEuZmllbGRzLnAxaGVhZGVyKTtcclxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmZpZWxkcy5wMXNoZWV0cyA9PSBcIjFcIikgJCgnI3MtcDFzaGVldHMnKS5hdHRyKCdjaGVja2VkJywgJ2NoZWNrZWQnKTtcclxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmZpZWxkcy5wMWFjdGl2ZSA9PSBcIjFcIikgJCgnI3MtcDFhY3RpdmUnKS5hdHRyKCdjaGVja2VkJywgJ2NoZWNrZWQnKTtcclxuICAgICAgICAgICAgICAgICQoJyNzLXA1a25hbWUnKS52YWwoZGF0YS5maWVsZHMucDVuYW1lKTtcclxuICAgICAgICAgICAgICAgICQoJyNzLXA1aGVhZGVyJykudmFsKGRhdGEuZmllbGRzLnA1aGVhZGVyKTtcclxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmZpZWxkcy5wNXNoZWV0cyA9PSBcIjFcIikgJCgnI3MtcDVzaGVldHMnKS5hdHRyKCdjaGVja2VkJywgJ2NoZWNrZWQnKTtcclxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmZpZWxkcy5wNWFjdGl2ZSA9PSBcIjFcIikgJCgnI3MtcDVhY3RpdmUnKS5hdHRyKCdjaGVja2VkJywgJ2NoZWNrZWQnKTtcclxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmZpZWxkcy5ncm91cGVkID09IFwiMVwiKSAkKCcjcy1ncm91cGVkJykuYXR0cignY2hlY2tlZCcsICdjaGVja2VkJyk7XHJcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5maWVsZHMuZ3JvdXBlZGhpZGUgPT0gXCIxXCIpICQoJyNzLWdyb3VwZWRoaWRlJykuYXR0cignY2hlY2tlZCcsICdjaGVja2VkJyk7XHJcbiAgICAgICAgICAgICAgICBmb3JtTG9hZGVyU3RvcCgpO1xyXG4gICAgICAgICAgICAgICAgcHJlc2V0c1VwZGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgdXBkYXRlTWlzY0ltYWdlcygpO1xyXG4gICAgICAgICAgICAgICAgJCgnI2NyZWF0ZVByZXNldCcpLm1vZGFsKCdzaG93Jyk7XHJcbiAgICAgICAgICAgICAgICB1cGRhdGVVSVByZXNldHMoZGF0YS5wcmVzZXRzKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZXJyb3I6IGpzRXJyb3JcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG5cclxuICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcucHJlc2V0LWl0ZW0gLmFjdGlvbi1kZWxldGUnLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICB2YXIgaWQgPSAkKHRoaXMpLmRhdGEoJ2lkJyk7XHJcbiAgICAgICAgc3dhbCh7XHJcbiAgICAgICAgICAgIHRpdGxlOiBcItCS0Ysg0YPQstC10YDQtdC90Ys/XCIsXHJcbiAgICAgICAgICAgIHRleHQ6IFwi0K3RgtC+INC00LXQudGB0YLQstC40LUg0L3QtdC+0LHRgNCw0YLQuNC80L4uINCj0LTQsNC70LjRgtGMINC/0YDQtdGB0LXRgj9cIixcclxuICAgICAgICAgICAgdHlwZTogXCJ3YXJuaW5nXCIsXHJcbiAgICAgICAgICAgIGNsb3NlT25Db25maXJtOiBmYWxzZSxcclxuICAgICAgICAgICAgY29uZmlybUJ1dHRvbkNvbG9yOiBcIiMyQ0E4RkZcIixcclxuICAgICAgICAgICAgY29uZmlybUJ1dHRvblRleHQ6IFwi0KPQtNCw0LvQuNGC0YxcIixcclxuICAgICAgICAgICAgc2hvd0xvYWRlck9uQ29uZmlybTogdHJ1ZSxcclxuICAgICAgICAgICAgc2hvd0NhbmNlbEJ1dHRvbjogdHJ1ZSxcclxuICAgICAgICAgICAgY2FuY2VsQnV0dG9uVGV4dDogXCLQntGC0LzQtdC90LBcIixcclxuICAgICAgICB9LCBmdW5jdGlvbiAoaXNDb25maXJtKSB7XHJcbiAgICAgICAgICAgIGlmICghaXNDb25maXJtKSByZXR1cm47XHJcbiAgICAgICAgICAgICQuYWpheCh7XHJcbiAgICAgICAgICAgICAgICB1cmw6IGFwaVVybCArICdncm91cHMvJyArIGlkICsgJy9kZWxldGUnLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJQT1NUXCIsXHJcbiAgICAgICAgICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxyXG4gICAgICAgICAgICAgICAgZGF0YToge3Rva2VuOiB0b2tlbn0sXHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHN3YWwoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogXCLQo9GB0L/QtdGFXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IGRhdGEubWVzc2FnZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJzdWNjZXNzXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpcm1CdXR0b25Db2xvcjogXCIjMkNBOEZGXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcmVzZXRzVXBkYXRlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlVUlQcmVzZXRzKGRhdGEucHJlc2V0cyk7XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgZXJyb3I6IGpzRXJyb3JcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfSk7XHJcblxyXG4gICAgJChkb2N1bWVudCkub24oJ2NoYW5nZScsICcjcHJlc2V0LXNlbGVjdCcsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIGZvcm1Mb2FkZXJTdGFydCgpO1xyXG4gICAgICAgIHZhciBpZCA9ICQodGhpcykudmFsKCk7XHJcbiAgICAgICAgJC5hamF4KHtcclxuICAgICAgICAgICAgdXJsOiBhcGlVcmwgKyAnZ3JvdXBzLycgKyBpZCArICcvc2VsZWN0JyxcclxuICAgICAgICAgICAgdHlwZTogXCJQT1NUXCIsXHJcbiAgICAgICAgICAgIGRhdGFUeXBlOiAnanNvbicsXHJcbiAgICAgICAgICAgIGRhdGE6IHt0b2tlbjogdG9rZW59LFxyXG4gICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgdXBkYXRlVUlQcmVzZXRzKGRhdGEucHJlc2V0cyk7XHJcbiAgICAgICAgICAgICAgICB2aWV3UGFnZShhcHBQYWdlQ3VycmVudCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGVycm9yOiBqc0Vycm9yXHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxuXHJcbn0pO1xyXG5cclxuXHJcbiIsImZ1bmN0aW9uIHByaWNlc0luaXQoKSB7XHJcbiAgICBwcmljZXNVcGRhdGUoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcHJpY2VzVXBkYXRlKCkge1xyXG4gICAgY29uc29sZS5sb2coYXBpVXJsICsgJ3ByaWNlcycpO1xyXG4gICAgJC5hamF4KHtcclxuICAgICAgICB1cmw6IGFwaVVybCArICdwcmljZXMnLFxyXG4gICAgICAgIG1ldGhvZDogXCJHRVRcIixcclxuICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxyXG4gICAgICAgIGRhdGE6IHt0b2tlbjogdG9rZW59LFxyXG4gICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgIHZhciBodG1sID0gJyc7XHJcbiAgICAgICAgICAgIGlmIChkYXRhLmNvdW50IDwgMSkge1xyXG4gICAgICAgICAgICAgICAgJCgnI25vLXByaWNlcycpLnNob3coMCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAkKCcjbm8tcHJpY2VzJykuaGlkZSgwKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAkLmVhY2goZGF0YS5pdGVtcywgZnVuY3Rpb24gKGssIHByaWNlKSB7XHJcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiY29sLXNtLTZcIj48ZGl2IGNsYXNzPVwiY2FyZCBwcmljZS1pdGVtXCIgZGF0YS1pZD1cIicgKyBwcmljZS5pZCArICdcIj4nO1xyXG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGgzPicgKyBwcmljZS5uYW1lICsgJzwvaDM+PGRpdiBjbGFzcz1cInJvd1wiPjxkaXYgY2xhc3M9XCJjb2wtc20tNlwiPic7XHJcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8cD7QmNC30LzQtdC90ZHQvTogPGNvZGU+JyArIG1vbWVudC51bml4KHByaWNlLnVwZGF0ZWQsICd0aW1lJykuZm9ybWF0KCdISDptbSBERC5NTS5ZWVlZJykgKyAnPC9jb2RlPiDQstC10YDRgdC40Y8gPGNvZGU+JyArIHByaWNlLnJldmlzaW9uICsgJzwvY29kZT48L3A+JztcclxuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2PjxkaXYgY2xhc3M9XCJjb2wtc20tNiBoLWRyIGgtbWMgYWN0aW9ucy1wcmljZXNcIj4nO1xyXG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGJ1dHRvbiBjbGFzcz1cImJ0biBidG4taW5mbyBidG4taWNvbiAgYnRuLWljb24tbWluaSBidG4tcm91bmQgYWN0aW9uLWFkZFwiIGRhdGEtaWQ9XCInICsgcHJpY2UuaWQgKyAnXCI+PGkgY2xhc3M9XCJmYSBmYS1wbHVzXCI+PC9pPjwvYnV0dG9uPic7XHJcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8YnV0dG9uIGNsYXNzPVwiYnRuIGJ0bi1pbmZvIGJ0bi1pY29uICBidG4taWNvbi1taW5pIGJ0bi1yb3VuZCBhY3Rpb24tZWRpdFwiIGRhdGEtaWQ9XCInICsgcHJpY2UuaWQgKyAnXCI+PGkgY2xhc3M9XCJmYSBmYS1wZW5jaWxcIj48L2k+PC9idXR0b24+JztcclxuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxidXR0b24gY2xhc3M9XCJidG4gYnRuLWRhbmdlciBidG4taWNvbiAgYnRuLWljb24tbWluaSBidG4tcm91bmQgYWN0aW9uLWRlbGV0ZVwiIGRhdGEtaWQ9XCInICsgcHJpY2UuaWQgKyAnXCI+PGkgY2xhc3M9XCJmYSBmYS10cmFzaFwiPjwvaT48L2J1dHRvbj4nO1xyXG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+PGRpdiBjbGFzcz1cInByaWNlcy1zb3VyY2VzXCI+JztcclxuICAgICAgICAgICAgICAgICQuZWFjaChwcmljZS5zb3VyY2VzLCBmdW5jdGlvbiAoa2ssIHNvdXJjZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJwcmljZS1zb3VyY2Ugcm93XCI+PGRpdiBjbGFzcz1cImNvbC1tZC02XCI+JztcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc291cmNlLnR5cGUgPT0gJ2Nsb3VkJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBodG1sICs9ICc8aSBjbGFzcz1cImZhIGZhLWNsb3VkXCI+PC9pPiAnO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc291cmNlLnR5cGUgPT0gJ2xpbmsnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwiZmEgZmEtbGlua1wiPjwvaT4gJztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxjb2RlPicgKyBzb3VyY2Uuc291cmNlICsgJzwvY29kZT48L2Rpdj48ZGl2IGNsYXNzPVwiY29sLXNtLTYgaC1kciBoLW1jIGFjdGlvbnMtcHJpY2VzLXNvdXJjZXNcIj4nO1xyXG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxidXR0b24gY2xhc3M9XCJidG4gYnRuLWluZm8gYnRuLWljb24gIGJ0bi1pY29uLW1pbmkgYnRuLXJvdW5kIGFjdGlvbi1lZGl0XCIgZGF0YS1pZD1cIicgKyBzb3VyY2UuaWQgKyAnXCI+PGkgY2xhc3M9XCJmYSBmYS1wZW5jaWxcIj48L2k+PC9idXR0b24+JztcclxuICAgICAgICAgICAgICAgICAgICBodG1sICs9ICc8YnV0dG9uIGNsYXNzPVwiYnRuIGJ0bi1kYW5nZXIgYnRuLWljb24gIGJ0bi1pY29uLW1pbmkgYnRuLXJvdW5kIGFjdGlvbi1kZWxldGVcIiBkYXRhLWlkPVwiJyArIHNvdXJjZS5pZCArICdcIj48aSBjbGFzcz1cImZhIGZhLXRyYXNoXCI+PC9pPjwvYnV0dG9uPidcclxuICAgICAgICAgICAgICAgICAgICBodG1sICs9ICc8L2Rpdj48L2Rpdj4nO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8L2Rpdj48L2Rpdj48L2Rpdj48L2Rpdj48L2Rpdj48L2Rpdj4nO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICQoJyNwcmljZXMtaXRlbXMnKS5odG1sKGh0bWwpO1xyXG4gICAgICAgICAgICBmb3JtTG9hZGVyU3RvcCgpO1xyXG4gICAgICAgICAgICB1cGRhdGVVSVByZXNldHMoZGF0YS5wcmVzZXRzKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGVycm9yOiBqc0Vycm9yXHJcbiAgICB9KTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVByaWNlVHlwZVNlbGVjdCgpIHtcclxuICAgIGlmICgkKCcjcHJpY2VUeXBlJykudmFsKCkgPT0gJ2Nsb3VkJykge1xyXG4gICAgICAgICQoJy5wcmljZVNlbGVjdENsb3VkRmlsZScpLnNob3coMCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgICQoJy5wcmljZVNlbGVjdENsb3VkRmlsZScpLmhpZGUoMCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbiQoZnVuY3Rpb24gKCkge1xyXG4gICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJy5wcmljZS1ncm91cC1jcmVhdGUnLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAkKCcjZm9ybS1wcmljZS1ncm91cCcpLmRhdGEoJ2lkJywgJ25ldycpO1xyXG4gICAgICAgICQoJyNjcmVhdGVQcmljZUdyb3VwJykubW9kYWwoJ3Nob3cnKTtcclxuICAgIH0pO1xyXG5cclxuICAgICQoZG9jdW1lbnQpLm9uKCdzdWJtaXQnLCAnI2Zvcm0tcHJpY2UtZ3JvdXAnLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICBmb3JtTG9hZGVyU3RhcnQoKTtcclxuICAgICAgICB2YXIgaWQgPSAkKHRoaXMpLmRhdGEoJ2lkJyk7XHJcblxyXG5cclxuICAgICAgICB2YXIgZGF0YSA9ICQodGhpcykuc2VyaWFsaXplKCkgKyBcIiZ0b2tlbj1cIiArIHRva2VuO1xyXG4gICAgICAgIHZhciB1cmwgPSBhcGlVcmwgKyAncHJpY2VzJztcclxuXHJcbiAgICAgICAgaWYgKGlkICE9ICduZXcnKSB7XHJcbiAgICAgICAgICAgIHVybCArPSAnLycgKyBpZDtcclxuICAgICAgICB9XHJcbiAgICAgICAgJC5hamF4KHtcclxuICAgICAgICAgICAgdXJsOiB1cmwsXHJcbiAgICAgICAgICAgIG1ldGhvZDogXCJQT1NUXCIsXHJcbiAgICAgICAgICAgIGRhdGFUeXBlOiAnanNvbicsXHJcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXHJcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAkKCcjZm9ybS1wcmljZS1ncm91cCcpLnRyaWdnZXIoXCJyZXNldFwiKTtcclxuICAgICAgICAgICAgICAgICQoJyNjcmVhdGVQcmljZUdyb3VwJykubW9kYWwoJ2hpZGUnKTtcclxuICAgICAgICAgICAgICAgIHRvYXN0ci5zdWNjZXNzKGRhdGEubWVzc2FnZSwgJ9Cj0YHQv9C10YUnKTtcclxuICAgICAgICAgICAgICAgIHByaWNlc1VwZGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgdXBkYXRlVUlQcmVzZXRzKGRhdGEucHJlc2V0cyk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGVycm9yOiBqc0Vycm9yXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfSk7XHJcblxyXG4gICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJy5hY3Rpb25zLXByaWNlcyAuYWN0aW9uLWVkaXQnLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICB2YXIgaWQgPSAkKHRoaXMpLmRhdGEoJ2lkJyk7XHJcbiAgICAgICAgJCgnI2Zvcm0tcHJpY2UtZ3JvdXAnKS5kYXRhKCdpZCcsIGlkKTtcclxuICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICB1cmw6IGFwaVVybCArICdwcmljZXMvJyArIGlkLFxyXG4gICAgICAgICAgICBtZXRob2Q6IFwiR0VUXCIsXHJcbiAgICAgICAgICAgIGRhdGFUeXBlOiAnanNvbicsXHJcbiAgICAgICAgICAgIGRhdGE6IHt0b2tlbjogdG9rZW59LFxyXG4gICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgJCgnI2Zvcm0tcHJpY2UtZ3JvdXAnKS50cmlnZ2VyKFwicmVzZXRcIik7XHJcbiAgICAgICAgICAgICAgICAkKCcjZm9ybS1wcmljZS1ncm91cCBpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nKS5yZW1vdmVBdHRyKCdjaGVja2VkJyk7XHJcbiAgICAgICAgICAgICAgICAkKCcjcHJpY2VHcm91cE5hbWUnKS52YWwoZGF0YS5uYW1lKTtcclxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmNoZWNrRG91YmxlKSAkKCcjcHJpY2VHcm91cENoZWNrRG91YmxlJykuYXR0cignY2hlY2tlZCcsICdjaGVja2VkJyk7XHJcbiAgICAgICAgICAgICAgICBmb3JtTG9hZGVyU3RvcCgpO1xyXG4gICAgICAgICAgICAgICAgJCgnI2NyZWF0ZVByaWNlR3JvdXAnKS5tb2RhbCgnc2hvdycpO1xyXG4gICAgICAgICAgICAgICAgdXBkYXRlVUlQcmVzZXRzKGRhdGEucHJlc2V0cyk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGVycm9yOiBqc0Vycm9yXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfSk7XHJcblxyXG4gICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJy5wcmljZVNlbGVjdENsb3VkRmlsZScsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIGZpbGVNYW5hZ2VyT3Blbihmcy5wcmljZXMsIFsndHh0J10sIGZ1bmN0aW9uIChyZXNwKSB7XHJcbiAgICAgICAgICAgIGlmICghcmVzcCkge1xyXG4gICAgICAgICAgICAgICAgLy8kKCcjcHJpY2VQYXRoJykudmFsKCcnKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICQoJyNwcmljZVBhdGgnKS52YWwocmVzcC5wYXRoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcblxyXG5cclxuICAgICQoZG9jdW1lbnQpLm9uKCdjaGFuZ2UnLCAnI3ByaWNlVHlwZScsIHVwZGF0ZVByaWNlVHlwZVNlbGVjdCk7XHJcblxyXG4gICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJy5hY3Rpb25zLXByaWNlcyAuYWN0aW9uLWFkZCcsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIHZhciBpZCA9ICQodGhpcykuZGF0YSgnaWQnKTtcclxuICAgICAgICAkKCcjZm9ybS1wcmljZScpLmRhdGEoJ2lkJywgJ25ldycpO1xyXG4gICAgICAgICQoJyNwcmljZVBhcmVudCcpLnZhbChpZCk7XHJcbiAgICAgICAgdXBkYXRlUHJpY2VUeXBlU2VsZWN0KCk7XHJcbiAgICAgICAgJCgnI2NyZWF0ZVByaWNlJykubW9kYWwoJ3Nob3cnKTtcclxuICAgIH0pO1xyXG5cclxuXHJcbiAgICAkKGRvY3VtZW50KS5vbignc3VibWl0JywgJyNmb3JtLXByaWNlJywgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgdmFyIGlkID0gJCh0aGlzKS5kYXRhKCdpZCcpO1xyXG4gICAgICAgIHZhciB1cmwgPSBhcGlVcmwgKyAncHJpY2VzU291cmNlcyc7XHJcbiAgICAgICAgaWYgKGlkICE9ICduZXcnKSB7XHJcbiAgICAgICAgICAgIHVybCArPSAnLycgKyBpZDtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGRhdGEgPSAkKHRoaXMpLnNlcmlhbGl6ZSgpICsgXCImdG9rZW49XCIgKyB0b2tlbjtcclxuICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICB1cmw6IHVybCxcclxuICAgICAgICAgICAgbWV0aG9kOiBcIlBPU1RcIixcclxuICAgICAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcclxuICAgICAgICAgICAgZGF0YTogZGF0YSxcclxuICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICQoJyNmb3JtLXByaWNlJykudHJpZ2dlcihcInJlc2V0XCIpO1xyXG4gICAgICAgICAgICAgICAgJCgnI2Zvcm0tcHJpY2UgaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJykucmVtb3ZlQXR0cignY2hlY2tlZCcpO1xyXG4gICAgICAgICAgICAgICAgJCgnI2NyZWF0ZVByaWNlJykubW9kYWwoJ2hpZGUnKTtcclxuICAgICAgICAgICAgICAgIHRvYXN0ci5zdWNjZXNzKGRhdGEubWVzc2FnZSwgJ9Cj0YHQv9C10YUnKTtcclxuICAgICAgICAgICAgICAgIHByaWNlc1VwZGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgdXBkYXRlVUlQcmVzZXRzKGRhdGEucHJlc2V0cyk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGVycm9yOiBqc0Vycm9yXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfSk7XHJcblxyXG4gICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJy5hY3Rpb25zLXByaWNlcy1zb3VyY2VzIC5hY3Rpb24tZWRpdCcsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIHZhciBpZCA9ICQodGhpcykuZGF0YSgnaWQnKTtcclxuICAgICAgICAkKCcjZm9ybS1wcmljZScpLmRhdGEoJ2lkJywgaWQpO1xyXG4gICAgICAgICQuYWpheCh7XHJcbiAgICAgICAgICAgIHVybDogYXBpVXJsICsgJ3ByaWNlc1NvdXJjZXMvJyArIGlkLFxyXG4gICAgICAgICAgICBtZXRob2Q6IFwiR0VUXCIsXHJcbiAgICAgICAgICAgIGRhdGFUeXBlOiAnanNvbicsXHJcbiAgICAgICAgICAgIGRhdGE6IHt0b2tlbjogdG9rZW59LFxyXG4gICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgJCgnI2Zvcm0tcHJpY2UnKS50cmlnZ2VyKFwicmVzZXRcIik7XHJcbiAgICAgICAgICAgICAgICAkKCcjZm9ybS1wcmljZSBpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nKS5yZW1vdmVBdHRyKCdjaGVja2VkJyk7XHJcbiAgICAgICAgICAgICAgICAkKCcjcHJpY2VQYXRoJykudmFsKGRhdGEuc291cmNlKTtcclxuICAgICAgICAgICAgICAgICQoJyNwcmljZVR5cGUnKS52YWwoZGF0YS50eXBlKTtcclxuICAgICAgICAgICAgICAgIHVwZGF0ZVByaWNlVHlwZVNlbGVjdCgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEubGFzdEJveCkgJCgnI3ByaWNlTGFzdEJveCcpLmF0dHIoJ2NoZWNrZWQnLCAnY2hlY2tlZCcpO1xyXG4gICAgICAgICAgICAgICAgZm9ybUxvYWRlclN0b3AoKTtcclxuICAgICAgICAgICAgICAgICQoJyNjcmVhdGVQcmljZScpLm1vZGFsKCdzaG93Jyk7XHJcbiAgICAgICAgICAgICAgICB1cGRhdGVVSVByZXNldHMoZGF0YS5wcmVzZXRzKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZXJyb3I6IGpzRXJyb3JcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG5cclxuXHJcbiAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnLmFjdGlvbnMtcHJpY2VzLXNvdXJjZXMgLmFjdGlvbi1kZWxldGUnLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICB2YXIgaWQgPSAkKHRoaXMpLmRhdGEoJ2lkJyk7XHJcbiAgICAgICAgc3dhbCh7XHJcbiAgICAgICAgICAgIHRpdGxlOiBcItCS0Ysg0YPQstC10YDQtdC90Ys/XCIsXHJcbiAgICAgICAgICAgIHRleHQ6IFwi0K3RgtC+INC00LXQudGB0YLQstC40LUg0L3QtdC+0LHRgNCw0YLQuNC80L4uINCj0LTQsNC70LjRgtGMINC40YHRgtC+0YfQvdC40Lo/XCIsXHJcbiAgICAgICAgICAgIHR5cGU6IFwid2FybmluZ1wiLFxyXG4gICAgICAgICAgICBjbG9zZU9uQ29uZmlybTogZmFsc2UsXHJcbiAgICAgICAgICAgIGNvbmZpcm1CdXR0b25Db2xvcjogXCIjMkNBOEZGXCIsXHJcbiAgICAgICAgICAgIGNvbmZpcm1CdXR0b25UZXh0OiBcItCj0LTQsNC70LjRgtGMXCIsXHJcbiAgICAgICAgICAgIHNob3dMb2FkZXJPbkNvbmZpcm06IHRydWUsXHJcbiAgICAgICAgICAgIHNob3dDYW5jZWxCdXR0b246IHRydWUsXHJcbiAgICAgICAgICAgIGNhbmNlbEJ1dHRvblRleHQ6IFwi0J7RgtC80LXQvdCwXCIsXHJcbiAgICAgICAgfSwgZnVuY3Rpb24gKGlzQ29uZmlybSkge1xyXG4gICAgICAgICAgICBpZiAoIWlzQ29uZmlybSkgcmV0dXJuO1xyXG4gICAgICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICAgICAgdXJsOiBhcGlVcmwgKyAncHJpY2VzU291cmNlcy8nICsgaWQgKyAnL2RlbGV0ZScsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBcIlBPU1RcIixcclxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiAnanNvbicsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7dG9rZW46IHRva2VufSxcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3dhbCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiBcItCj0YHQv9C10YVcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogZGF0YS5tZXNzYWdlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcInN1Y2Nlc3NcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlybUJ1dHRvbkNvbG9yOiBcIiMyQ0E4RkZcIixcclxuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByaWNlc1VwZGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZVVJUHJlc2V0cyhkYXRhLnByZXNldHMpO1xyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIGVycm9yOiBqc0Vycm9yXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcblxyXG5cclxuICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcuYWN0aW9ucy1wcmljZXMgLmFjdGlvbi1kZWxldGUnLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICB2YXIgaWQgPSAkKHRoaXMpLmRhdGEoJ2lkJyk7XHJcbiAgICAgICAgc3dhbCh7XHJcbiAgICAgICAgICAgIHRpdGxlOiBcItCS0Ysg0YPQstC10YDQtdC90Ys/XCIsXHJcbiAgICAgICAgICAgIHRleHQ6IFwi0K3RgtC+INC00LXQudGB0YLQstC40LUg0L3QtdC+0LHRgNCw0YLQuNC80L4uINCj0LTQsNC70LjRgtGMINC/0YDQsNC50YEg0Lgg0LLRgdC1INC10LPQviDQuNGB0YLQvtGH0L3QuNC60Lg/XCIsXHJcbiAgICAgICAgICAgIHR5cGU6IFwid2FybmluZ1wiLFxyXG4gICAgICAgICAgICBjbG9zZU9uQ29uZmlybTogZmFsc2UsXHJcbiAgICAgICAgICAgIGNvbmZpcm1CdXR0b25Db2xvcjogXCIjMkNBOEZGXCIsXHJcbiAgICAgICAgICAgIGNvbmZpcm1CdXR0b25UZXh0OiBcItCj0LTQsNC70LjRgtGMXCIsXHJcbiAgICAgICAgICAgIHNob3dMb2FkZXJPbkNvbmZpcm06IHRydWUsXHJcbiAgICAgICAgICAgIHNob3dDYW5jZWxCdXR0b246IHRydWUsXHJcbiAgICAgICAgICAgIGNhbmNlbEJ1dHRvblRleHQ6IFwi0J7RgtC80LXQvdCwXCIsXHJcbiAgICAgICAgfSwgZnVuY3Rpb24gKGlzQ29uZmlybSkge1xyXG4gICAgICAgICAgICBpZiAoIWlzQ29uZmlybSkgcmV0dXJuO1xyXG4gICAgICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICAgICAgdXJsOiBhcGlVcmwgKyAncHJpY2VzLycgKyBpZCArICcvZGVsZXRlJyxcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwiUE9TVFwiLFxyXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHt0b2tlbjogdG9rZW59LFxyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICBzd2FsKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6IFwi0KPRgdC/0LXRhVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBkYXRhLm1lc3NhZ2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwic3VjY2Vzc1wiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25maXJtQnV0dG9uQ29sb3I6IFwiIzJDQThGRlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJpY2VzVXBkYXRlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlVUlQcmVzZXRzKGRhdGEucHJlc2V0cyk7XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgZXJyb3I6IGpzRXJyb3JcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxuXHJcbn0pO1xyXG4iLCJ2YXIgYXBwUGFnZUN1cnJlbnQgPSAnbWFpbic7XHJcbnZhciB0b3BwZWQgPSBmYWxzZTtcclxuXHJcbmZ1bmN0aW9uIHZpZXdQYWdlKHBhZ2VOYW1lLCBub0hpc3RvcnkpIHtcclxuICAgICQoJy5wYWdlJykuaGlkZSgwKTtcclxuICAgICQoJyNuYXZpZ2F0aW9uIC5uYXYtaXRlbScpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcclxuICAgICQoJyNuYXZpZ2F0aW9uIC5uYXYtaXRlbVtkYXRhLW1lbnUtcGFnZT1cIicgKyBwYWdlTmFtZSArICdcIl0nKS5hZGRDbGFzcygnYWN0aXZlJyk7XHJcbiAgICB2YXIgdGl0bGUgPSAkKCcjbmF2aWdhdGlvbiAubmF2LWl0ZW1bZGF0YS1tZW51LXBhZ2U9XCInICsgcGFnZU5hbWUgKyAnXCJdIGEnKS50ZXh0KCk7XHJcbiAgICAkKCcuZGF0YS10aXRsZScpLnRleHQodGl0bGUpO1xyXG4gICAgJCgnI3BhZ2UtJyArIHBhZ2VOYW1lKS5zaG93KDApO1xyXG5cclxuICAgIGlmICghbm9IaXN0b3J5KSB7XHJcbiAgICAgICAgaGlzdG9yeS5wdXNoU3RhdGUobnVsbCwgZG9jdW1lbnQudGl0bGUsIHBhZ2VOYW1lKTtcclxuICAgIH1cclxuICAgIGNvbnNvbGUubG9nKCdDaGFuZ2UgcGFnZSAnLCBhcHBQYWdlQ3VycmVudCwgJz0+JywgcGFnZU5hbWUpO1xyXG4gICAgZG9jdW1lbnQudGl0bGUgPSB0aXRsZSA/IHRpdGxlIDogJ1BTRiBQYW5lbCc7XHJcbiAgICBhcHBQYWdlQ3VycmVudCA9IHBhZ2VOYW1lO1xyXG4gICAgaWYgKHBhZ2VOYW1lID09ICdwcmVzZXRzJykge1xyXG4gICAgICAgIHByZXNldHNJbml0KCk7XHJcbiAgICB9IGVsc2UgaWYgKHBhZ2VOYW1lID09ICdjYXRlZ29yaWVzJykge1xyXG4gICAgICAgIC8vY2F0ZWdvcmllc0luaXQoKTtcclxuICAgIH0gZWxzZSBpZiAocGFnZU5hbWUgPT0gJ3ByaWNlcycpIHtcclxuICAgICAgICBwcmljZXNJbml0KCk7XHJcbiAgICB9IGVsc2UgaWYgKHBhZ2VOYW1lID09ICdncm91cHMnKSB7XHJcbiAgICAgICAgZ3JvdXBzSW5pdCgpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBmb3JtTG9hZGVyU3RhcnQoKSB7XHJcbiAgICAkKCcjZm9ybS1sb2FkZXInKS5zaG93KDApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmb3JtTG9hZGVyU3RvcCgpIHtcclxuICAgICQoJyNmb3JtLWxvYWRlcicpLmhpZGUoMCk7XHJcbn1cclxuXHJcbnZhciBtaXNjSW1hZ2VzID0gW107XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVNaXNjSW1hZ2VzKCkge1xyXG4gICAgJC5hamF4KHtcclxuXHJcbiAgICAgICAgdXJsOiBhcGlVcmwgKyAnaW1hZ2VzL21pc2MnLFxyXG4gICAgICAgIG1ldGhvZDogXCJHRVRcIixcclxuICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxyXG4gICAgICAgIGRhdGE6IHt0b2tlbjogdG9rZW59LFxyXG4gICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgIG1pc2NJbWFnZXMgPSBkYXRhO1xyXG5cclxuICAgICAgICAgICAgJCgnaW5wdXQubWlzY2ltYWdlJykuZWFjaChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcmFuZElkID0gbWFrZWlkKCk7XHJcbiAgICAgICAgICAgICAgICAkKHRoaXMpLnNlbGVjdGl6ZSh7XHJcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9uczogZGF0YSxcclxuICAgICAgICAgICAgICAgICAgICBtYXhJdGVtczogMSxcclxuICAgICAgICAgICAgICAgICAgICBsYWJlbEZpZWxkOiAnbmFtZScsXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVGaWVsZDogJ3BhdGgnLFxyXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaEZpZWxkOiBbJ25hbWUnXSxcclxuICAgICAgICAgICAgICAgICAgICByZW5kZXI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9uOiBmdW5jdGlvbiAoaXRlbSwgZXNjYXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJzxkaXYgY2xhc3M9XCJtaXNjLWltYWdlLWl0ZW1cIj4nICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnPGltZyBzcmM9XCInICsgZXNjYXBlKGl0ZW0udXJsKSArICdcIiBhbHQ9XCJcIj4nICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnPHNwYW4gY2xhc3M9XCJuYW1lXCI+JyArIGVzY2FwZShpdGVtLm5hbWUpICsgJzwvc3Bhbj4nICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnPC9kaXY+JztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZXJyb3I6IGpzRXJyb3JcclxuICAgIH0pO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gcmVzZXRNaXNjSW1hZ2VzKCkge1xyXG4gICAgdmFyICRtaXNjaW1hZ2UgPSAkKCdpbnB1dC5taXNjaW1hZ2UnKTtcclxuICAgICRtaXNjaW1hZ2UuZWFjaChmdW5jdGlvbiAoaWR4KSB7XHJcblxyXG4gICAgICAgIGlmICgkKCdpbnB1dC5taXNjaW1hZ2UnKS5zZWxlY3RpemUpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICQodGhpcykuc2VsZWN0aXplKClbMF0uc2VsZWN0aXplLmRlc3Ryb3koKTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgJG1pc2NpbWFnZS5yZW1vdmVDbGFzcygnc2VsZWN0aXplZCcpLnNob3coMCk7XHJcbiAgICAkKCdkaXYubWlzY2ltYWdlJykucmVtb3ZlKCk7XHJcbn1cclxuXHJcbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICBjb25zb2xlLmxvZyh3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3Vic3RyKDEpKTtcclxuICAgIHZpZXdQYWdlKHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zdWJzdHIoMSksIHRydWUpO1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG59KTtcclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVVJUHJlc2V0cyhwcmVzZXRzKSB7XHJcbiAgICBfc2VsZWN0SHRtbCA9ICcnO1xyXG4gICAgY29uc29sZS5sb2cocHJlc2V0cyk7XHJcbiAgICBpZiAocHJlc2V0cy5jb3VudCA8IDEpIHtcclxuICAgICAgICBpZihhcHBQYWdlQ3VycmVudCAhPT0gJ3ByZXNldHMnKSB7XHJcbiAgICAgICAgICAgIHZpZXdQYWdlKCdwcmVzZXRzJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICAkLmVhY2gocHJlc2V0cy5pdGVtcywgZnVuY3Rpb24gKGssIHByZXNldCkge1xyXG4gICAgICAgICAgICBfc2VsZWN0SHRtbCArPSAnPG9wdGlvbiB2YWx1ZT1cIicrIHByZXNldC5pZCArICdcIiAnICsgKHByZXNldC5hY3RpdmUgPyAnc2VsZWN0ZWQnIDogJycpICsgJz4nICsgcHJlc2V0Lm5hbWUgKyAnPC9vcHRpb24+JztcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgICQoJyNwcmVzZXQtc2VsZWN0JykuaHRtbChfc2VsZWN0SHRtbCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxhdW5jaCgpIHtcclxuICAgICQuYWpheCh7XHJcbiAgICAgICAgdXJsOiBhcGlVcmwgKyAndXNlci9tZScsXHJcbiAgICAgICAgbWV0aG9kOiBcIkdFVFwiLFxyXG4gICAgICAgIGRhdGFUeXBlOiAnanNvbicsXHJcbiAgICAgICAgZGF0YToge3Rva2VuOiB0b2tlbn0sXHJcbiAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwidG9rZW5cIiwgdG9rZW4pO1xyXG4gICAgICAgICAgICAkKCcuZGF0YS1hY2NvdW50LW5hbWUnKS50ZXh0KGRhdGEubmFtZSk7XHJcbiAgICAgICAgICAgIHVwZGF0ZVVJUHJlc2V0cyhkYXRhLnByZXNldHMpO1xyXG4gICAgICAgICAgICB2aWV3UGFnZShhcHBQYWdlQ3VycmVudCA9PSAnbG9naW4nID8gJ21haW4nIDogYXBwUGFnZUN1cnJlbnQpO1xyXG5cclxuICAgICAgICAgICAgaGlkZVByZWxvYWRlcigpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZXJyb3I6IGpzRXJyb3JcclxuICAgIH0pO1xyXG4gICAgLy8gdXBkYXRlTWlzY0ltYWdlcygpO1xyXG4gICAgLy8gZmlsZU1hbmFnZXJPcGVuKGZzLnByaWNlcywgW10sIGZ1bmN0aW9uIChyZXNwKSB7XHJcbiAgICAvLyAgICAgaWYoIXJlc3Ape1xyXG4gICAgLy8gICAgICAgICBjb25zb2xlLmxvZygnY2xvc2VkJyk7XHJcbiAgICAvLyAgICAgfSBlbHNlIHtcclxuICAgIC8vICAgICAgICAgY29uc29sZS5sb2cocmVzcCk7XHJcbiAgICAvLyAgICAgfVxyXG4gICAgLy8gfSk7XHJcblxyXG59XHJcblxyXG5mdW5jdGlvbiBsb2dvdXQoKSB7XHJcbiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcInRva2VuXCIsIG51bGwpO1xyXG4gICAgdG9rZW4gPSBudWxsO1xyXG4gICAgaW5pdCgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBoaWRlUHJlbG9hZGVyKCkge1xyXG4gICAgJCgnLnByZWxvYWRlcicpLmZhZGVPdXQoMzAwKTtcclxufVxyXG5cclxuZnVuY3Rpb24gc2hvd1ByZWxvYWRlcigpIHtcclxuICAgICQoJy5wcmVsb2FkZXInKS5mYWRlSW4oMzAwKTtcclxufVxyXG5cclxuXHJcbiQoZnVuY3Rpb24gKCkge1xyXG4gICAgYXBwUGFnZUN1cnJlbnQgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3Vic3RyKDEpLmxlbmd0aCA/IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zdWJzdHIoMSkgOiAnbWFpbic7XHJcbiAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnLm1lbnUtbGluaycsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIHZhciBpZCA9ICQodGhpcykuYXR0cignaHJlZicpLnN1YnN0cigxKTtcclxuXHJcbiAgICAgICAgdmlld1BhZ2UoaWQpO1xyXG4gICAgICAgICQoXCIjYm9keUNsaWNrXCIpLnRyaWdnZXIoJ2NsaWNrJyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAkKGRvY3VtZW50KS5vbignc3VibWl0JywgXCIjZm9ybS1sb2dpblwiLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICB2YXIgZGF0YSA9ICQodGhpcykuc2VyaWFsaXplKCkgKyBcIiZ0b2tlbj1cIiArIHRva2VuO1xyXG4gICAgICAgICQuYWpheCh7XHJcbiAgICAgICAgICAgIHVybDogYXBpVXJsICsgJ2F1dGgnLFxyXG4gICAgICAgICAgICBtZXRob2Q6IFwiUE9TVFwiLFxyXG4gICAgICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxyXG4gICAgICAgICAgICBkYXRhOiBkYXRhLFxyXG4gICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgdG9rZW4gPSBkYXRhLnRva2VuO1xyXG4gICAgICAgICAgICAgICAgc2hvd1ByZWxvYWRlcigpO1xyXG4gICAgICAgICAgICAgICAgbGF1bmNoKCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGVycm9yOiBqc0Vycm9yXHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnLmxvZ291dCcsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIGxvZ291dCgpO1xyXG4gICAgfSk7XHJcbiAgICBzeW5jU2Nyb2xsKCk7XHJcblxyXG5cclxuICAgIFB1bGxUb1JlZnJlc2guaW5pdCh7XHJcbiAgICAgICAgbWFpbkVsZW1lbnQ6ICcjYycsIC8vIGFib3ZlIHdoaWNoIGVsZW1lbnQ/XHJcbiAgICAgICAgcGFzc2l2ZTogZmFsc2UsXHJcbiAgICAgICAgc2hvdWxkUHVsbFRvUmVmcmVzaDogZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgcmV0dXJuICEkKCdib2R5JykuaGFzQ2xhc3MoJ21vZGFsLW9wZW4nKSAmJiB0b3BwZWQ7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBvblJlZnJlc2g6IGZ1bmN0aW9uIChkb25lKSB7XHJcbiAgICAgICAgICAgIHZpZXdQYWdlKGFwcFBhZ2VDdXJyZW50KVxyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGRvbmUoKTsgLy8gZW5kIHB1bGwgdG8gcmVmcmVzaFxyXG4gICAgICAgICAgICB9LCAxNTAwKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuXHJcblxyXG5cclxufSk7XHJcblxyXG5mdW5jdGlvbiBzeW5jU2Nyb2xsKCkge1xyXG4gICAgdmFyIHNjcm9sbGVkID0gd2luZG93LnBhZ2VZT2Zmc2V0IHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxUb3A7XHJcbiAgICB2YXIgX29sZFRvcHBlZCA9IHRvcHBlZDtcclxuICAgIGlmIChzY3JvbGxlZCA+PSA2Mykge1xyXG4gICAgICAgIHRvcHBlZCA9IGZhbHNlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB0b3BwZWQgPSB0cnVlO1xyXG4gICAgfVxyXG4gICAgaWYgKHRvcHBlZCAhPSBfb2xkVG9wcGVkKSB7XHJcbiAgICAgICAgaWYgKHRvcHBlZCkge1xyXG4gICAgICAgICAgICAkKCdib2R5JykuYWRkQ2xhc3MoJ3RvcHBlZCcpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICQoJ2JvZHknKS5yZW1vdmVDbGFzcygndG9wcGVkJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG53aW5kb3cub25zY3JvbGwgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBzeW5jU2Nyb2xsKCk7XHJcblxyXG5cclxufTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
