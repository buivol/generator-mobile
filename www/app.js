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


function updatePriceTypeSelect(){
    if($('#priceType').val() == 'cloud'){
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

    $(document).on('click', '.actions-prices-sources .action-edit', function(e){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUuanMiLCJlcnJvcnMuanMiLCJmcy5qcyIsImhlbHBlcnMuanMiLCJwcmVzZXRzLmpzIiwicHJpY2VzLmpzIiwidWkuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzVRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgdmVyc2lvbiA9ICczLjAuMCBBbHBoYSc7XHJcblxyXG52YXIgc2VydmVyVmVyc2lvbiA9ICd1bmtub3duJztcclxudmFyIGFwaVVybCA9IGZhbHNlO1xyXG52YXIgdG9rZW4gPSAnJztcclxuXHJcblxyXG5cclxuZnVuY3Rpb24gc3VwcG9ydFN0b3JhZ2UoKSB7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIHJldHVybiAnbG9jYWxTdG9yYWdlJyBpbiB3aW5kb3cgJiYgd2luZG93Wydsb2NhbFN0b3JhZ2UnXSAhPT0gbnVsbDtcclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGluaXQoKSB7XHJcblxyXG4gICAgJCgnLnBhZ2UnKS5oaWRlKDApO1xyXG5cclxuICAgIGlmICghc3VwcG9ydFN0b3JhZ2UoKSkge1xyXG4gICAgICAgIGFsZXJ0KCfQodC60LDRh9Cw0Lkg0L3QvtGA0LzQsNC70YzQvdGL0Lkg0LHRgNCw0YPQt9C10YAsINC00LjQvdC+0LfQsNCy0YAhJyk7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHRva2VuID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3Rva2VuJyk7XHJcblxyXG4gICAgJC5hamF4KHtcclxuICAgICAgICB1cmw6IElOSVRfVVJMLFxyXG4gICAgICAgIG1ldGhvZDogXCJHRVRcIixcclxuICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxyXG4gICAgICAgIGRhdGE6IHt0b2tlbjogdG9rZW59LFxyXG4gICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwic3VjY2Vzc2Z1bGx5IHJ1biBhamF4IHJlcXVlc3QuLi5cIiwgZGF0YSk7XHJcbiAgICAgICAgICAgIHNlcnZlclZlcnNpb24gPSBkYXRhLnZlcnNpb247XHJcbiAgICAgICAgICAgIGFwaVVybCA9IGRhdGEuYXBpVXJsO1xyXG4gICAgICAgICAgICBmcyA9IGRhdGEuZnM7XHJcbiAgICAgICAgICAgICQoJy5kYXRhLXNlcnZlci12ZXJzaW9uJykudGV4dChzZXJ2ZXJWZXJzaW9uKTtcclxuICAgICAgICAgICAgJCgnLmRhdGEtdmVyc2lvbicpLnRleHQodmVyc2lvbik7XHJcbiAgICAgICAgICAgIGlmIChkYXRhLmlzR3Vlc3QpIHtcclxuICAgICAgICAgICAgICAgIC8vINCz0L7RgdGC0YxcclxuICAgICAgICAgICAgICAgIHZpZXdQYWdlKCdsb2dpbicpO1xyXG4gICAgICAgICAgICAgICAgaGlkZVByZWxvYWRlcigpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbGF1bmNoKCk7XHJcbiAgICAgICAgICAgICAgICBoaWRlUHJlbG9hZGVyKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIGVycm9yOiBqc0Vycm9yXHJcbiAgICB9KTtcclxuXHJcbn1cclxuXHJcblxyXG5cclxuJChmdW5jdGlvbiAoKSB7XHJcbiAgICBpbml0KCk7XHJcbn0pOyIsInZhciBqc0Vycm9yID0gZnVuY3Rpb24oZGF0YSlcclxue1xyXG4gICAgdG9hc3RyLmVycm9yKGRhdGEucmVzcG9uc2VKU09OLmVycm9yLm1lc3NhZ2UsICfQntGI0LjQsdC60LAnKVxyXG4gICAgY29uc29sZS5lcnJvcihkYXRhKTtcclxuICAgIGlmIChkYXRhLnN0YXR1cyA9PSA0MDMpIHtcclxuICAgICAgICBjb25zb2xlLndhcm5pbmcoJ3VuYXV0aG9yaXplZCcpO1xyXG4gICAgICAgIC8vdmlld1BhZ2UoJ2xvZ2luJywgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnN1YnN0cigxKSk7XHJcbiAgICB9XHJcbiAgICBmb3JtTG9hZGVyU3RvcCgpO1xyXG59IiwidmFyIGZpbGVtYW5hZ2VyLCBicmVhZGNydW1icywgZmlsZUxpc3Q7XHJcbnZhciBmaWxlbWFuYWdlckN1cnJlbnREaXIgPSAnLyc7XHJcbnZhciBmaWxlbWFuYWdlckN1cnJlbnRUeXBlcyA9IFtdO1xyXG52YXIgZmlsZW1hbmFnZXJTdGFydERpciA9ICcvJztcclxudmFyIGRlZmF1bHRGaWxlbWFuYWdlckNhbGxCYWNrID0gZnVuY3Rpb24gKHBhdGgpIHtcclxuICAgIGNvbnNvbGUubG9nKCdmbSBkZWZhdWx0IGNhbGxiYWNrJywgcGF0aClcclxufTtcclxudmFyIGZpbGVtYW5hZ2VyQ2FsbGJhY2s7XHJcblxyXG5cclxuZnVuY3Rpb24gZmlsZU1hbmFnZXJMb2FkZXJTdGFydCgpIHtcclxuICAgICQoJy5maWxlbWFuYWdlciAubG9hZGVyJykuc2hvdygwKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZmlsZU1hbmFnZXJMb2FkZXJTdG9wKCkge1xyXG4gICAgJCgnLmZpbGVtYW5hZ2VyIC5sb2FkZXInKS5oaWRlKDApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmc0xzKGRpcikge1xyXG4gICAgZmlsZU1hbmFnZXJMb2FkZXJTdGFydCgpO1xyXG4gICAgZmlsZUxpc3QucmVtb3ZlQ2xhc3MoJ2FuaW1hdGVkJyk7XHJcbiAgICBmaWxlTGlzdC5jc3MoeydkaXNwbGF5JzogJ25vbmUnfSk7XHJcbiAgICAkLmFqYXgoe1xyXG4gICAgICAgIHVybDogYXBpVXJsICsgJ2ZzL2xzJyxcclxuICAgICAgICB0eXBlOiBcIkdFVFwiLFxyXG4gICAgICAgIGRhdGFUeXBlOiAnanNvbicsXHJcbiAgICAgICAgZGF0YToge3Rva2VuOiB0b2tlbiwgcGF0aDogZGlyfSxcclxuICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICBmaWxlbWFuYWdlckN1cnJlbnREaXIgPSBkYXRhLnBhdGg7XHJcbiAgICAgICAgICAgIGZpbGVtYW5hZ2VyLmZpbmQoJy5wYXRoJykudGV4dChmaWxlbWFuYWdlckN1cnJlbnREaXIpO1xyXG4gICAgICAgICAgICBmaWxlTWFuYWdlclJlbmRlcihkYXRhLml0ZW1zKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGVycm9yOiBqc0Vycm9yXHJcbiAgICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gZnNNZChuZXdEaXIsIGRpcikge1xyXG4gICAgZmlsZUxpc3QucmVtb3ZlQ2xhc3MoJ2FuaW1hdGVkJyk7XHJcbiAgICBmaWxlTGlzdC5jc3MoeydkaXNwbGF5JzogJ25vbmUnfSk7XHJcbiAgICAkLmFqYXgoe1xyXG4gICAgICAgIHVybDogYXBpVXJsICsgJ2ZzL21kJyxcclxuICAgICAgICB0eXBlOiBcIkdFVFwiLFxyXG4gICAgICAgIGRhdGFUeXBlOiAnanNvbicsXHJcbiAgICAgICAgZGF0YToge3Rva2VuOiB0b2tlbiwgcGF0aDogZGlyLCBuYW1lOiBuZXdEaXJ9LFxyXG4gICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgIGZpbGVtYW5hZ2VyQ3VycmVudERpciA9IGRhdGEucGF0aDtcclxuICAgICAgICAgICAgZnNMcyhmaWxlbWFuYWdlckN1cnJlbnREaXIpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZXJyb3I6IGpzRXJyb3JcclxuICAgIH0pO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gZmlsZU1hbmFnZXJPcGVuKGRpciwgdHlwZXMsIGNhbGxiYWNrKSB7XHJcbiAgICBmaWxlbWFuYWdlclN0YXJ0RGlyID0gZGlyID8gZGlyIDogJy8nO1xyXG4gICAgZmlsZW1hbmFnZXJDYWxsYmFjayA9IGNhbGxiYWNrID8gY2FsbGJhY2sgOiBkZWZhdWx0RmlsZW1hbmFnZXJDYWxsQmFjaztcclxuICAgIGZpbGVtYW5hZ2VyQ3VycmVudFR5cGVzID0gdHlwZXMgPyB0eXBlcyA6IFtdO1xyXG4gICAgZmlsZW1hbmFnZXIuY3NzKCdkaXNwbGF5JywgJ2Jsb2NrJyk7XHJcbiAgICBmc0xzKGRpcilcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGVzY2FwZUhUTUwodGV4dCkge1xyXG4gICAgcmV0dXJuIHRleHQucmVwbGFjZSgvXFwmL2csICcmYW1wOycpLnJlcGxhY2UoL1xcPC9nLCAnJmx0OycpLnJlcGxhY2UoL1xcPi9nLCAnJmd0OycpO1xyXG59XHJcblxyXG5cclxuLy8gQ29udmVydCBmaWxlIHNpemVzIGZyb20gYnl0ZXMgdG8gaHVtYW4gcmVhZGFibGUgdW5pdHNcclxuXHJcbmZ1bmN0aW9uIGJ5dGVzVG9TaXplKGJ5dGVzKSB7XHJcbiAgICB2YXIgc2l6ZXMgPSBbJ9Cx0LDQudGCJywgJ9C60LEnLCAn0LzQsScsICfQs9CxJywgJ9GC0LEnXTtcclxuICAgIGlmIChieXRlcyA9PSAwKSByZXR1cm4gJ9C/0YPRgdGC0L7QuSc7XHJcbiAgICB2YXIgaSA9IHBhcnNlSW50KE1hdGguZmxvb3IoTWF0aC5sb2coYnl0ZXMpIC8gTWF0aC5sb2coMTAyNCkpKTtcclxuICAgIHJldHVybiBNYXRoLnJvdW5kKGJ5dGVzIC8gTWF0aC5wb3coMTAyNCwgaSksIDIpICsgJyAnICsgc2l6ZXNbaV07XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBmaWxlTWFuYWdlclJlbmRlcihkYXRhKSB7XHJcblxyXG4gICAgdmFyIHNjYW5uZWRGb2xkZXJzID0gW10sXHJcbiAgICAgICAgc2Nhbm5lZEZpbGVzID0gW107XHJcblxyXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcclxuXHJcbiAgICAgICAgZGF0YS5mb3JFYWNoKGZ1bmN0aW9uIChkKSB7XHJcblxyXG4gICAgICAgICAgICBpZiAoZC50eXBlID09PSAnZm9sZGVyJykge1xyXG4gICAgICAgICAgICAgICAgc2Nhbm5lZEZvbGRlcnMucHVzaChkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmIChkLnR5cGUgPT09ICdmaWxlJykge1xyXG4gICAgICAgICAgICAgICAgc2Nhbm5lZEZpbGVzLnB1c2goZCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAodHlwZW9mIGRhdGEgPT09ICdvYmplY3QnKSB7XHJcblxyXG4gICAgICAgIHNjYW5uZWRGb2xkZXJzID0gZGF0YS5mb2xkZXJzO1xyXG4gICAgICAgIHNjYW5uZWRGaWxlcyA9IGRhdGEuZmlsZXM7XHJcblxyXG4gICAgfVxyXG5cclxuXHJcbiAgICAvLyBFbXB0eSB0aGUgb2xkIHJlc3VsdCBhbmQgbWFrZSB0aGUgbmV3IG9uZVxyXG5cclxuICAgIGZpbGVMaXN0LmVtcHR5KCkuaGlkZSgpO1xyXG5cclxuICAgIGlmICghc2Nhbm5lZEZvbGRlcnMubGVuZ3RoICYmICFzY2FubmVkRmlsZXMubGVuZ3RoKSB7XHJcbiAgICAgICAgZmlsZW1hbmFnZXIuZmluZCgnLm5vdGhpbmdmb3VuZCcpLnNob3coKTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIGZpbGVtYW5hZ2VyLmZpbmQoJy5ub3RoaW5nZm91bmQnKS5oaWRlKCk7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGlmIChzY2FubmVkRm9sZGVycy5sZW5ndGgpIHtcclxuXHJcbiAgICAgICAgc2Nhbm5lZEZvbGRlcnMuZm9yRWFjaChmdW5jdGlvbiAoZikge1xyXG5cclxuICAgICAgICAgICAgdmFyIG5hbWUgPSBlc2NhcGVIVE1MKGYubmFtZSksXHJcbiAgICAgICAgICAgICAgICBpY29uID0gJzxzcGFuIGNsYXNzPVwiaWNvbiBmb2xkZXJcIj48L3NwYW4+JztcclxuXHJcbiAgICAgICAgICAgIHZhciBmb2xkZXIgPSAkKCc8bGkgY2xhc3M9XCJmb2xkZXJzXCI+PGEgaHJlZj1cIicgKyBmLnBhdGggKyAnXCIgdGl0bGU9XCInICsgZi5wYXRoICsgJ1wiIGNsYXNzPVwiZm9sZGVyc1wiPicgKyBpY29uICsgJzxzcGFuIGNsYXNzPVwibmFtZVwiPicgKyBuYW1lICsgJzwvc3Bhbj48L2E+PC9saT4nKTtcclxuICAgICAgICAgICAgZm9sZGVyLmFwcGVuZFRvKGZpbGVMaXN0KTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHNjYW5uZWRGaWxlcy5sZW5ndGgpIHtcclxuXHJcbiAgICAgICAgc2Nhbm5lZEZpbGVzLmZvckVhY2goZnVuY3Rpb24gKGYpIHtcclxuXHJcbiAgICAgICAgICAgIHZhciBmaWxlU2l6ZSA9IGJ5dGVzVG9TaXplKGYuc2l6ZSksXHJcbiAgICAgICAgICAgICAgICBuYW1lID0gZXNjYXBlSFRNTChmLm5hbWUpLFxyXG4gICAgICAgICAgICAgICAgZmlsZVR5cGUgPSBuYW1lLnNwbGl0KCcuJyksXHJcbiAgICAgICAgICAgICAgICBpY29uID0gJzxzcGFuIGNsYXNzPVwiaWNvbiBmaWxlXCI+PC9zcGFuPic7XHJcbiAgICAgICAgICAgIGZpbGVUeXBlID0gZmlsZVR5cGVbZmlsZVR5cGUubGVuZ3RoIC0gMV07XHJcbiAgICAgICAgICAgIGlmICghZmlsZW1hbmFnZXJDdXJyZW50VHlwZXMubGVuZ3RoIHx8IGZpbGVtYW5hZ2VyQ3VycmVudFR5cGVzLmpvaW4oJywnKS5pbmRleE9mKGZpbGVUeXBlKSA+PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBpY29uID0gJzxzcGFuIGNsYXNzPVwiaWNvbiBmaWxlIGYtJyArIGZpbGVUeXBlICsgJ1wiPi4nICsgZmlsZVR5cGUgKyAnPC9zcGFuPic7XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIGZpbGUgPSAkKCc8bGkgY2xhc3M9XCJmaWxlc1wiPjxhIGhyZWY9XCInICsgZi5wYXRoICsgJ1wiIHRpdGxlPVwiJyArIGYucGF0aCArICdcIiBjbGFzcz1cImZpbGVzXCI+JyArIGljb24gKyAnPHNwYW4gY2xhc3M9XCJuYW1lXCI+JyArIG5hbWUgKyAnPC9zcGFuPiA8c3BhbiBjbGFzcz1cImRldGFpbHNcIj4nICsgZmlsZVNpemUgKyAnPC9zcGFuPjwvYT48L2xpPicpO1xyXG4gICAgICAgICAgICAgICAgZmlsZS5hcHBlbmRUbyhmaWxlTGlzdCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9XHJcblxyXG5cclxuICAgIC8vIEdlbmVyYXRlIHRoZSBicmVhZGNydW1ic1xyXG4gICAgZmlsZU1hbmFnZXJMb2FkZXJTdG9wKCk7XHJcblxyXG4gICAgaWYgKGZpbGVtYW5hZ2VyLmhhc0NsYXNzKCdzZWFyY2hpbmcnKSkge1xyXG5cclxuICAgICAgICBmaWxlTGlzdC5yZW1vdmVDbGFzcygnYW5pbWF0ZWQnKTtcclxuXHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuXHJcbiAgICAgICAgZmlsZUxpc3QuYWRkQ2xhc3MoJ2FuaW1hdGVkJyk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGZpbGVMaXN0LmNzcyh7J2Rpc3BsYXknOiAnaW5saW5lLWJsb2NrJ30pO1xyXG5cclxufVxyXG5cclxuXHJcbiQoZnVuY3Rpb24gKCkge1xyXG5cclxuICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcuZmlsZW1hbmFnZXIgLmFjdGlvbnMgYnV0dG9uLmFjdGlvbi1yZWZyZXNoJywgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgZnNMcyhmaWxlbWFuYWdlckN1cnJlbnREaXIpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJy5maWxlbWFuYWdlciAuYWN0aW9ucyBidXR0b24uYWN0aW9uLWJhY2snLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhmaWxlbWFuYWdlclN0YXJ0RGlyLCBmaWxlbWFuYWdlckN1cnJlbnREaXIpO1xyXG4gICAgICAgIGlmIChmaWxlbWFuYWdlclN0YXJ0RGlyLnJlcGxhY2UoL15cXC98XFwvJC9nLCAnJykgPT0gZmlsZW1hbmFnZXJDdXJyZW50RGlyLnJlcGxhY2UoL15cXC98XFwvJC9nLCAnJykpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgcGF0aCA9IGZpbGVtYW5hZ2VyQ3VycmVudERpci5zcGxpdCgnLycpO1xyXG4gICAgICAgIHBhdGgucG9wKCk7XHJcbiAgICAgICAgcGF0aCA9IHBhdGguam9pbignLycpO1xyXG4gICAgICAgIGZzTHMocGF0aCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnLmZpbGVtYW5hZ2VyIC5hY3Rpb25zIGJ1dHRvbi5hY3Rpb24tY3JlYXRlJywgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICBmaWxlTWFuYWdlckxvYWRlclN0YXJ0KCk7XHJcbiAgICAgICAgdmFyIGZvbGRlck5hbWUgPSBwcm9tcHQoXCLQndCw0LfQstCw0L3QuNC1INC90L7QstC+0Lkg0L/QsNC/0LrQuFwiLCBcItCd0L7QstCw0Y8g0L/QsNC/0LrQsFwiKTtcclxuICAgICAgICBpZiAoZm9sZGVyTmFtZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGZzTWQoZm9sZGVyTmFtZSwgZmlsZW1hbmFnZXJDdXJyZW50RGlyKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBmaWxlTWFuYWdlckxvYWRlclN0b3AoKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnLmZpbGVtYW5hZ2VyIC5hY3Rpb25zIGJ1dHRvbi5hY3Rpb24tdXBsb2FkLCAuZmlsZW1hbmFnZXIgLm5vZmlsZXMnLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAkKCcjZnMtZmlsZS1maWVsZCcpLmNsaWNrKCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAkKGRvY3VtZW50KS5vbignY2hhbmdlJywgJyNmcy1maWxlLWZpZWxkJywgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgaWYgKCQodGhpcykudmFsKCkgPT0gJycpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICQoJyNmcy1maWxlJykuc3VibWl0KCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgJChkb2N1bWVudCkub24oXCJzdWJtaXRcIiwgJyNmcy1maWxlJywgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICBmaWxlTWFuYWdlckxvYWRlclN0YXJ0KCk7XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIHZhciBmb3JtID0gJCh0aGlzKTtcclxuICAgICAgICB2YXIgZm9ybURhdGEgPSBuZXcgRm9ybURhdGEoZm9ybVswXSk7XHJcbiAgICAgICAgZm9ybURhdGEuYXBwZW5kKCd0b2tlbicsIHRva2VuKTtcclxuICAgICAgICBmb3JtRGF0YS5hcHBlbmQoJ3BhdGgnLCBmaWxlbWFuYWdlckN1cnJlbnREaXIpO1xyXG4gICAgICAgICQuYWpheCh7XHJcbiAgICAgICAgICAgIHVybDogYXBpVXJsICsgJ2ZzL2luJyxcclxuICAgICAgICAgICAgdHlwZTogXCJQT1NUXCIsXHJcbiAgICAgICAgICAgIHByb2Nlc3NEYXRhOiBmYWxzZSxcclxuICAgICAgICAgICAgY29udGVudFR5cGU6IGZhbHNlLFxyXG4gICAgICAgICAgICBkYXRhOiBmb3JtRGF0YSxcclxuICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKHJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgZnNMcyhyZXN1bHQucGF0aCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGVycm9yOiBqc0Vycm9yXHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBmaWxlbWFuYWdlciA9ICQoJy5maWxlbWFuYWdlcicpO1xyXG4gICAgYnJlYWRjcnVtYnMgPSAkKCcuYnJlYWRjcnVtYnMnKTtcclxuICAgIGZpbGVMaXN0ID0gZmlsZW1hbmFnZXIuZmluZCgnLmRhdGEnKTtcclxuXHJcblxyXG4gICAgLy8gQ2xpY2tpbmcgb24gZm9sZGVyc1xyXG5cclxuICAgIGZpbGVMaXN0Lm9uKCdjbGljaycsICdsaS5mb2xkZXJzJywgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG4gICAgICAgIHZhciBuZXh0RGlyID0gJCh0aGlzKS5maW5kKCdhLmZvbGRlcnMnKS5hdHRyKCdocmVmJyk7XHJcblxyXG4gICAgICAgIGZzTHMobmV4dERpcik7XHJcbiAgICB9KTtcclxuXHJcbiAgICB2YXIgdG1kO1xyXG5cclxuICAgIC8vINCU0L7QsdCw0LLQu9GP0LXQvCDQutC70LDRgdGBIGhvdmVyINC/0YDQuCDQvdCw0LLQtdC00LXQvdC40LhcclxuICAgIGZpbGVtYW5hZ2VyLm9uKCdkcmFnb3ZlcicsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBjbGVhclRpbWVvdXQodG1kKTtcclxuICAgICAgICAkKCdib2R5JykuYWRkQ2xhc3MoJ2Ryb3AnKTtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyDQo9Cx0LjRgNCw0LXQvCDQutC70LDRgdGBIGhvdmVyXHJcbiAgICBmaWxlbWFuYWdlci5vbignZHJhZ2xlYXZlJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGNsZWFyVGltZW91dCh0bWQpO1xyXG4gICAgICAgIHRtZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAkKCdib2R5JykucmVtb3ZlQ2xhc3MoJ2Ryb3AnKTtcclxuICAgICAgICB9LCA2MDApO1xyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyDQntCx0YDQsNCx0LDRgtGL0LLQsNC10Lwg0YHQvtCx0YvRgtC40LUgRHJvcFxyXG4gICAgJCgnYm9keScpWzBdLm9uZHJvcCA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgJCgnYm9keScpLnJlbW92ZUNsYXNzKCdkcm9wJyk7XHJcbiAgICAgICAgLy8gZHJvcFpvbmUucmVtb3ZlQ2xhc3MoJ2hvdmVyJyk7XHJcbiAgICAgICAgLy8gZHJvcFpvbmUuYWRkQ2xhc3MoJ2Ryb3AnKTtcclxuICAgICAgICAvL1xyXG5cclxuICAgICAgICBjb25zb2xlLmxvZyhldmVudC5kYXRhVHJhbnNmZXIpO1xyXG4gICAgICAgIHZhciBmaWxlID0gZXZlbnQuZGF0YVRyYW5zZmVyLmZpbGVzWzBdO1xyXG4gICAgICAgIGZpbGVNYW5hZ2VyTG9hZGVyU3RhcnQoKTtcclxuICAgICAgICB2YXIgZm9ybSA9ICQodGhpcyk7XHJcbiAgICAgICAgdmFyIGZvcm1EYXRhID0gbmV3IEZvcm1EYXRhKGZvcm1bMF0pO1xyXG4gICAgICAgIGZvcm1EYXRhLmFwcGVuZCgndG9rZW4nLCB0b2tlbik7XHJcbiAgICAgICAgZm9ybURhdGEuYXBwZW5kKCdmaWxlJywgZmlsZSk7XHJcbiAgICAgICAgZm9ybURhdGEuYXBwZW5kKCdwYXRoJywgZmlsZW1hbmFnZXJDdXJyZW50RGlyKTtcclxuICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICB1cmw6IGFwaVVybCArICdmcy9pbicsXHJcbiAgICAgICAgICAgIHR5cGU6IFwiUE9TVFwiLFxyXG4gICAgICAgICAgICBwcm9jZXNzRGF0YTogZmFsc2UsXHJcbiAgICAgICAgICAgIGNvbnRlbnRUeXBlOiBmYWxzZSxcclxuICAgICAgICAgICAgZGF0YTogZm9ybURhdGEsXHJcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChyZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgIGZzTHMocmVzdWx0LnBhdGgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBlcnJvcjoganNFcnJvclxyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuXHJcbiAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnLmZpbGVtYW5hZ2VyIGEuZmlsZXMnLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICBmaWxlbWFuYWdlci5jc3MoJ2Rpc3BsYXknLCAnbm9uZScpO1xyXG4gICAgICAgIHZhciByZXNwID0ge307XHJcbiAgICAgICAgcmVzcC5kaXIgPSBmaWxlbWFuYWdlckN1cnJlbnREaXI7XHJcbiAgICAgICAgcmVzcC5wYXRoID0gJCh0aGlzKS5wcm9wKCd0aXRsZScpO1xyXG4gICAgICAgIHJlc3AubmFtZSA9ICQodGhpcykuZmluZCgnLm5hbWUnKS50ZXh0KCk7XHJcbiAgICAgICAgcmVzcC5leHQgPSAkKHRoaXMpLmZpbmQoJy5maWxlJykudGV4dCgpO1xyXG4gICAgICAgIGZpbGVtYW5hZ2VyQ2FsbGJhY2socmVzcCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnLmZtLWNsb3NlJywgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgZmlsZW1hbmFnZXIuY3NzKCdkaXNwbGF5JywgJ25vbmUnKTtcclxuICAgICAgICBmaWxlbWFuYWdlckNhbGxiYWNrKGZhbHNlKTtcclxuICAgIH0pO1xyXG5cclxufSk7XHJcbiIsImZ1bmN0aW9uIG1ha2VpZCgpIHtcclxuICAgIHZhciB0ZXh0ID0gXCJcIjtcclxuICAgIHZhciBwb3NzaWJsZSA9IFwiQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODlcIjtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IDE1OyBpKyspXHJcbiAgICAgICAgdGV4dCArPSBwb3NzaWJsZS5jaGFyQXQoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogcG9zc2libGUubGVuZ3RoKSk7XHJcblxyXG4gICAgcmV0dXJuIHRleHQ7XHJcbn0iLCJmdW5jdGlvbiBwcmVzZXRzSW5pdCgpIHtcclxuICAgIHByZXNldHNVcGRhdGUoKTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIHByZXNldHNVcGRhdGUoKSB7XHJcbiAgICAkLmFqYXgoe1xyXG4gICAgICAgIHVybDogYXBpVXJsICsgJ2dyb3VwcycsXHJcbiAgICAgICAgbWV0aG9kOiBcIkdFVFwiLFxyXG4gICAgICAgIGRhdGFUeXBlOiAnanNvbicsXHJcbiAgICAgICAgZGF0YToge3Rva2VuOiB0b2tlbn0sXHJcbiAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgdmFyIGh0bWwgPSAnJztcclxuICAgICAgICAgICAgaWYgKGRhdGEuY291bnQuYWxsIDwgMSkge1xyXG4gICAgICAgICAgICAgICAgJCgnI25vLXByZXNldHMnKS5zaG93KDApO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgJCgnI25vLXByZXNldHMnKS5oaWRlKDApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICQuZWFjaChkYXRhLml0ZW1zLCBmdW5jdGlvbiAoaywgdikge1xyXG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cImNvbC1zbS02XCI+PGRpdiBjbGFzcz1cImNhcmQgcHJlc2V0LWl0ZW1cIiBkYXRhLWlkPVwiJyArIHYuaWQgKyAnXCI+JztcclxuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxoMz4nICsgdi5uYW1lICsgJzwvaDM+JztcclxuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJyb3dcIj48ZGl2IGNsYXNzPVwiY29sLXNtLTZcIj4nO1xyXG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPHA+0JDQstGC0L7RgDogPGNvZGU+JyArIHYub3duZXIudXNlcm5hbWUgKyAnPC9jb2RlPjwvcD4nO1xyXG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPHA+0JjQt9C80LXQvdGR0L06IDxjb2RlPicgKyBtb21lbnQudW5peCh2LnVwZGF0ZWQsICd0aW1lJykuZm9ybWF0KCdISDptbSBERC5NTS5ZWVlZJykgKyAnPC9jb2RlPjwvcD4nO1xyXG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+PGRpdiBjbGFzcz1cImNvbC1zbS02IGgtZHIgaC1tYyBhY3Rpb25zXCI+JztcclxuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxidXR0b24gY2xhc3M9XCJidG4gYnRuLWluZm8gYnRuLWljb24gYnRuLWljb24tbWluaSBidG4tcm91bmQgYWN0aW9uLWVkaXRcIiBkYXRhLWlkPVwiJyArIHYuaWQgKyAnXCI+PGkgY2xhc3M9XCJmYSBmYS1wZW5jaWxcIj48L2k+PC9idXR0b24+JztcclxuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxidXR0b24gY2xhc3M9XCJidG4gYnRuLWluZm8gYnRuLWljb24gYnRuLWljb24tbWluaSBidG4tcm91bmQgYWN0aW9uLXNoYXJlXCIgZGF0YS1pZD1cIicgKyB2LmlkICsgJ1wiPjxpIGNsYXNzPVwiZmEgZmEtc2hhcmUtYWx0XCI+PC9pPjwvYnV0dG9uPic7XHJcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8YnV0dG9uIGNsYXNzPVwiYnRuIGJ0bi1kYW5nZXIgYnRuLWljb24gYnRuLWljb24tbWluaSBidG4tcm91bmQgYWN0aW9uLWRlbGV0ZVwiIGRhdGEtaWQ9XCInICsgdi5pZCArICdcIj48aSBjbGFzcz1cImZhIGZhLXRyYXNoXCI+PC9pPjwvYnV0dG9uPic7XHJcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8L2Rpdj48L2Rpdj48L2Rpdj48L2Rpdj4nO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICQoJyNwcmVzZXRzLWl0ZW1zJykuaHRtbChodG1sKTtcclxuXHJcbiAgICAgICAgICAgIHVwZGF0ZVVJUHJlc2V0cyhkYXRhLnByZXNldHMpO1xyXG4gICAgICAgICAgICBmb3JtTG9hZGVyU3RvcCgpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZXJyb3I6IGpzRXJyb3JcclxuICAgIH0pO1xyXG59XHJcblxyXG4kKGZ1bmN0aW9uICgpIHtcclxuICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcucHJlc2V0cy1jcmVhdGUnLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICByZXNldE1pc2NJbWFnZXMoKTtcclxuICAgICAgICAvLyBjb250XHJcbiAgICAgICAgdXBkYXRlTWlzY0ltYWdlcygpO1xyXG4gICAgICAgICQoJyNmb3JtLXByZXNldCcpLmRhdGEoJ3ByZXNldCcsICduZXcnKTtcclxuICAgICAgICAkKCcjY3JlYXRlUHJlc2V0JykubW9kYWwoJ3Nob3cnKTtcclxuICAgIH0pO1xyXG5cclxuICAgICQoZG9jdW1lbnQpLm9uKCdzdWJtaXQnLCAnI2Zvcm0tcHJlc2V0JywgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgZm9ybUxvYWRlclN0YXJ0KCk7XHJcbiAgICAgICAgdmFyIGRhdGEgPSAkKHRoaXMpLnNlcmlhbGl6ZSgpICsgXCImdG9rZW49XCIgKyB0b2tlbjtcclxuICAgICAgICB2YXIgdXJsID0gYXBpVXJsICsgJ2dyb3Vwcyc7XHJcbiAgICAgICAgaWYgKCQodGhpcykuZGF0YSgncHJlc2V0JykgIT0gJ25ldycpIHtcclxuICAgICAgICAgICAgdXJsICs9ICcvJyArICQodGhpcykuZGF0YSgncHJlc2V0JylcclxuICAgICAgICB9XHJcbiAgICAgICAgJC5hamF4KHtcclxuICAgICAgICAgICAgdXJsOiB1cmwsXHJcbiAgICAgICAgICAgIG1ldGhvZDogXCJQT1NUXCIsXHJcbiAgICAgICAgICAgIGRhdGFUeXBlOiAnanNvbicsXHJcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXHJcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAkKCcjZm9ybS1wcmVzZXQnKS50cmlnZ2VyKFwicmVzZXRcIik7XHJcbiAgICAgICAgICAgICAgICAkKCcjY3JlYXRlUHJlc2V0JykubW9kYWwoJ2hpZGUnKTtcclxuICAgICAgICAgICAgICAgIHRvYXN0ci5zdWNjZXNzKGRhdGEubWVzc2FnZSwgJ9Cj0YHQv9C10YUnKTtcclxuICAgICAgICAgICAgICAgIHByZXNldHNVcGRhdGUoKTtcclxuICAgICAgICAgICAgICAgIHVwZGF0ZVVJUHJlc2V0cyhkYXRhLnByZXNldHMpO1xyXG4gICAgICAgICAgICAgICAgLy9ncm91cHNVcGRhdGVNeSh0cnVlKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZXJyb3I6IGpzRXJyb3JcclxuICAgICAgICB9KTtcclxuICAgICAgICAvLyQoJyNjcmVhdGVQcmVzZXQnKS5tb2RhbCgnaGlkZScpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJy5wcmVzZXQtaXRlbSAuYWN0aW9uLWVkaXQnLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICBmb3JtTG9hZGVyU3RhcnQoKTtcclxuICAgICAgICB2YXIgcHJlc2V0SWQgPSAkKHRoaXMpLmRhdGEoJ2lkJyk7XHJcbiAgICAgICAgJCgnI2Zvcm0tcHJlc2V0JykuZGF0YSgncHJlc2V0JywgcHJlc2V0SWQpO1xyXG4gICAgICAgIHJlc2V0TWlzY0ltYWdlcygpO1xyXG4gICAgICAgICQuYWpheCh7XHJcbiAgICAgICAgICAgIHVybDogYXBpVXJsICsgJ2dyb3Vwcy8nICsgcHJlc2V0SWQsXHJcbiAgICAgICAgICAgIG1ldGhvZDogXCJHRVRcIixcclxuICAgICAgICAgICAgZGF0YToge3Rva2VuOiB0b2tlbn0sXHJcbiAgICAgICAgICAgIGRhdGFUeXBlOiAnanNvbicsXHJcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAkKCcjZm9ybS1wcmVzZXQnKS50cmlnZ2VyKFwicmVzZXRcIik7XHJcbiAgICAgICAgICAgICAgICAkKCcjZm9ybS1wcmVzZXQgaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJykucmVtb3ZlQXR0cignY2hlY2tlZCcpO1xyXG4gICAgICAgICAgICAgICAgJCgnI3ByZXNldE5hbWUnKS52YWwoZGF0YS5uYW1lKTtcclxuICAgICAgICAgICAgICAgICQoJyNzLWNyZWF0b3InKS52YWwoZGF0YS5maWVsZHMuY3JlYXRvcik7XHJcbiAgICAgICAgICAgICAgICAkKCcjcy1sb2dvJykudmFsKGRhdGEuZmllbGRzLmxvZ28pO1xyXG4gICAgICAgICAgICAgICAgJCgnI3MtcGtuYW1lJykudmFsKGRhdGEuZmllbGRzLnBrbmFtZSk7XHJcbiAgICAgICAgICAgICAgICAkKCcjcy1wa2hlYWRlcicpLnZhbChkYXRhLmZpZWxkcy5wa2hlYWRlcik7XHJcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5maWVsZHMucGtzaGVldHMgPT0gXCIxXCIpICQoJyNzLXBrc2hlZXRzJykuYXR0cignY2hlY2tlZCcsICdjaGVja2VkJyk7XHJcbiAgICAgICAgICAgICAgICAkKCcjcy1wMWtuYW1lJykudmFsKGRhdGEuZmllbGRzLnAxbmFtZSk7XHJcbiAgICAgICAgICAgICAgICAkKCcjcy1wMWhlYWRlcicpLnZhbChkYXRhLmZpZWxkcy5wMWhlYWRlcik7XHJcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5maWVsZHMucDFzaGVldHMgPT0gXCIxXCIpICQoJyNzLXAxc2hlZXRzJykuYXR0cignY2hlY2tlZCcsICdjaGVja2VkJyk7XHJcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5maWVsZHMucDFhY3RpdmUgPT0gXCIxXCIpICQoJyNzLXAxYWN0aXZlJykuYXR0cignY2hlY2tlZCcsICdjaGVja2VkJyk7XHJcbiAgICAgICAgICAgICAgICAkKCcjcy1wNWtuYW1lJykudmFsKGRhdGEuZmllbGRzLnA1bmFtZSk7XHJcbiAgICAgICAgICAgICAgICAkKCcjcy1wNWhlYWRlcicpLnZhbChkYXRhLmZpZWxkcy5wNWhlYWRlcik7XHJcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5maWVsZHMucDVzaGVldHMgPT0gXCIxXCIpICQoJyNzLXA1c2hlZXRzJykuYXR0cignY2hlY2tlZCcsICdjaGVja2VkJyk7XHJcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5maWVsZHMucDVhY3RpdmUgPT0gXCIxXCIpICQoJyNzLXA1YWN0aXZlJykuYXR0cignY2hlY2tlZCcsICdjaGVja2VkJyk7XHJcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5maWVsZHMuZ3JvdXBlZCA9PSBcIjFcIikgJCgnI3MtZ3JvdXBlZCcpLmF0dHIoJ2NoZWNrZWQnLCAnY2hlY2tlZCcpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuZmllbGRzLmdyb3VwZWRoaWRlID09IFwiMVwiKSAkKCcjcy1ncm91cGVkaGlkZScpLmF0dHIoJ2NoZWNrZWQnLCAnY2hlY2tlZCcpO1xyXG4gICAgICAgICAgICAgICAgZm9ybUxvYWRlclN0b3AoKTtcclxuICAgICAgICAgICAgICAgIHByZXNldHNVcGRhdGUoKTtcclxuICAgICAgICAgICAgICAgIHVwZGF0ZU1pc2NJbWFnZXMoKTtcclxuICAgICAgICAgICAgICAgICQoJyNjcmVhdGVQcmVzZXQnKS5tb2RhbCgnc2hvdycpO1xyXG4gICAgICAgICAgICAgICAgdXBkYXRlVUlQcmVzZXRzKGRhdGEucHJlc2V0cyk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGVycm9yOiBqc0Vycm9yXHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnLnByZXNldC1pdGVtIC5hY3Rpb24tZGVsZXRlJywgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgdmFyIGlkID0gJCh0aGlzKS5kYXRhKCdpZCcpO1xyXG4gICAgICAgIHN3YWwoe1xyXG4gICAgICAgICAgICB0aXRsZTogXCLQktGLINGD0LLQtdGA0LXQvdGLP1wiLFxyXG4gICAgICAgICAgICB0ZXh0OiBcItCt0YLQviDQtNC10LnRgdGC0LLQuNC1INC90LXQvtCx0YDQsNGC0LjQvNC+LiDQo9C00LDQu9C40YLRjCDQv9GA0LXRgdC10YI/XCIsXHJcbiAgICAgICAgICAgIHR5cGU6IFwid2FybmluZ1wiLFxyXG4gICAgICAgICAgICBjbG9zZU9uQ29uZmlybTogZmFsc2UsXHJcbiAgICAgICAgICAgIGNvbmZpcm1CdXR0b25Db2xvcjogXCIjMkNBOEZGXCIsXHJcbiAgICAgICAgICAgIGNvbmZpcm1CdXR0b25UZXh0OiBcItCj0LTQsNC70LjRgtGMXCIsXHJcbiAgICAgICAgICAgIHNob3dMb2FkZXJPbkNvbmZpcm06IHRydWUsXHJcbiAgICAgICAgICAgIHNob3dDYW5jZWxCdXR0b246IHRydWUsXHJcbiAgICAgICAgICAgIGNhbmNlbEJ1dHRvblRleHQ6IFwi0J7RgtC80LXQvdCwXCIsXHJcbiAgICAgICAgfSwgZnVuY3Rpb24gKGlzQ29uZmlybSkge1xyXG4gICAgICAgICAgICBpZiAoIWlzQ29uZmlybSkgcmV0dXJuO1xyXG4gICAgICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICAgICAgdXJsOiBhcGlVcmwgKyAnZ3JvdXBzLycgKyBpZCArICcvZGVsZXRlJyxcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwiUE9TVFwiLFxyXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHt0b2tlbjogdG9rZW59LFxyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICBzd2FsKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6IFwi0KPRgdC/0LXRhVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBkYXRhLm1lc3NhZ2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwic3VjY2Vzc1wiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25maXJtQnV0dG9uQ29sb3I6IFwiIzJDQThGRlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJlc2V0c1VwZGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZVVJUHJlc2V0cyhkYXRhLnByZXNldHMpO1xyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIGVycm9yOiBqc0Vycm9yXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIH0pO1xyXG5cclxuICAgICQoZG9jdW1lbnQpLm9uKCdjaGFuZ2UnLCAnI3ByZXNldC1zZWxlY3QnLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICBmb3JtTG9hZGVyU3RhcnQoKTtcclxuICAgICAgICB2YXIgaWQgPSAkKHRoaXMpLnZhbCgpO1xyXG4gICAgICAgICQuYWpheCh7XHJcbiAgICAgICAgICAgIHVybDogYXBpVXJsICsgJ2dyb3Vwcy8nICsgaWQgKyAnL3NlbGVjdCcsXHJcbiAgICAgICAgICAgIHR5cGU6IFwiUE9TVFwiLFxyXG4gICAgICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxyXG4gICAgICAgICAgICBkYXRhOiB7dG9rZW46IHRva2VufSxcclxuICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIHVwZGF0ZVVJUHJlc2V0cyhkYXRhLnByZXNldHMpO1xyXG4gICAgICAgICAgICAgICAgdmlld1BhZ2UoYXBwUGFnZUN1cnJlbnQpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBlcnJvcjoganNFcnJvclxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcblxyXG59KTtcclxuXHJcblxyXG4iLCJmdW5jdGlvbiBwcmljZXNJbml0KCkge1xyXG4gICAgcHJpY2VzVXBkYXRlKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHByaWNlc1VwZGF0ZSgpIHtcclxuICAgIGNvbnNvbGUubG9nKGFwaVVybCArICdwcmljZXMnKTtcclxuICAgICQuYWpheCh7XHJcbiAgICAgICAgdXJsOiBhcGlVcmwgKyAncHJpY2VzJyxcclxuICAgICAgICBtZXRob2Q6IFwiR0VUXCIsXHJcbiAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcclxuICAgICAgICBkYXRhOiB7dG9rZW46IHRva2VufSxcclxuICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICB2YXIgaHRtbCA9ICcnO1xyXG4gICAgICAgICAgICBpZiAoZGF0YS5jb3VudCA8IDEpIHtcclxuICAgICAgICAgICAgICAgICQoJyNuby1wcmljZXMnKS5zaG93KDApO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgJCgnI25vLXByaWNlcycpLmhpZGUoMCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgJC5lYWNoKGRhdGEuaXRlbXMsIGZ1bmN0aW9uIChrLCBwcmljZSkge1xyXG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cImNvbC1zbS02XCI+PGRpdiBjbGFzcz1cImNhcmQgcHJpY2UtaXRlbVwiIGRhdGEtaWQ9XCInICsgcHJpY2UuaWQgKyAnXCI+JztcclxuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxoMz4nICsgcHJpY2UubmFtZSArICc8L2gzPjxkaXYgY2xhc3M9XCJyb3dcIj48ZGl2IGNsYXNzPVwiY29sLXNtLTZcIj4nO1xyXG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPHA+0JjQt9C80LXQvdGR0L06IDxjb2RlPicgKyBtb21lbnQudW5peChwcmljZS51cGRhdGVkLCAndGltZScpLmZvcm1hdCgnSEg6bW0gREQuTU0uWVlZWScpICsgJzwvY29kZT4g0LLQtdGA0YHQuNGPIDxjb2RlPicgKyBwcmljZS5yZXZpc2lvbiArICc8L2NvZGU+PC9wPic7XHJcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8L2Rpdj48ZGl2IGNsYXNzPVwiY29sLXNtLTYgaC1kciBoLW1jIGFjdGlvbnMtcHJpY2VzXCI+JztcclxuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxidXR0b24gY2xhc3M9XCJidG4gYnRuLWluZm8gYnRuLWljb24gIGJ0bi1pY29uLW1pbmkgYnRuLXJvdW5kIGFjdGlvbi1hZGRcIiBkYXRhLWlkPVwiJyArIHByaWNlLmlkICsgJ1wiPjxpIGNsYXNzPVwiZmEgZmEtcGx1c1wiPjwvaT48L2J1dHRvbj4nO1xyXG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGJ1dHRvbiBjbGFzcz1cImJ0biBidG4taW5mbyBidG4taWNvbiAgYnRuLWljb24tbWluaSBidG4tcm91bmQgYWN0aW9uLWVkaXRcIiBkYXRhLWlkPVwiJyArIHByaWNlLmlkICsgJ1wiPjxpIGNsYXNzPVwiZmEgZmEtcGVuY2lsXCI+PC9pPjwvYnV0dG9uPic7XHJcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8YnV0dG9uIGNsYXNzPVwiYnRuIGJ0bi1kYW5nZXIgYnRuLWljb24gIGJ0bi1pY29uLW1pbmkgYnRuLXJvdW5kIGFjdGlvbi1kZWxldGVcIiBkYXRhLWlkPVwiJyArIHByaWNlLmlkICsgJ1wiPjxpIGNsYXNzPVwiZmEgZmEtdHJhc2hcIj48L2k+PC9idXR0b24+JztcclxuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2PjxkaXYgY2xhc3M9XCJwcmljZXMtc291cmNlc1wiPic7XHJcbiAgICAgICAgICAgICAgICAkLmVhY2gocHJpY2Uuc291cmNlcywgZnVuY3Rpb24gKGtrLCBzb3VyY2UpIHtcclxuICAgICAgICAgICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwicHJpY2Utc291cmNlIHJvd1wiPjxkaXYgY2xhc3M9XCJjb2wtbWQtNlwiPic7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNvdXJjZS50eXBlID09ICdjbG91ZCcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJmYSBmYS1jbG91ZFwiPjwvaT4gJztcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNvdXJjZS50eXBlID09ICdsaW5rJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBodG1sICs9ICc8aSBjbGFzcz1cImZhIGZhLWxpbmtcIj48L2k+ICc7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBodG1sICs9ICc8Y29kZT4nICsgc291cmNlLnNvdXJjZSArICc8L2NvZGU+PC9kaXY+PGRpdiBjbGFzcz1cImNvbC1zbS02IGgtZHIgaC1tYyBhY3Rpb25zLXByaWNlcy1zb3VyY2VzXCI+JztcclxuICAgICAgICAgICAgICAgICAgICBodG1sICs9ICc8YnV0dG9uIGNsYXNzPVwiYnRuIGJ0bi1pbmZvIGJ0bi1pY29uICBidG4taWNvbi1taW5pIGJ0bi1yb3VuZCBhY3Rpb24tZWRpdFwiIGRhdGEtaWQ9XCInICsgc291cmNlLmlkICsgJ1wiPjxpIGNsYXNzPVwiZmEgZmEtcGVuY2lsXCI+PC9pPjwvYnV0dG9uPic7XHJcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSAnPGJ1dHRvbiBjbGFzcz1cImJ0biBidG4tZGFuZ2VyIGJ0bi1pY29uICBidG4taWNvbi1taW5pIGJ0bi1yb3VuZCBhY3Rpb24tZGVsZXRlXCIgZGF0YS1pZD1cIicgKyBzb3VyY2UuaWQgKyAnXCI+PGkgY2xhc3M9XCJmYSBmYS10cmFzaFwiPjwvaT48L2J1dHRvbj4nXHJcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+PC9kaXY+JztcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+PC9kaXY+PC9kaXY+PC9kaXY+PC9kaXY+PC9kaXY+JztcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAkKCcjcHJpY2VzLWl0ZW1zJykuaHRtbChodG1sKTtcclxuICAgICAgICAgICAgZm9ybUxvYWRlclN0b3AoKTtcclxuICAgICAgICAgICAgdXBkYXRlVUlQcmVzZXRzKGRhdGEucHJlc2V0cyk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBlcnJvcjoganNFcnJvclxyXG4gICAgfSk7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiB1cGRhdGVQcmljZVR5cGVTZWxlY3QoKXtcclxuICAgIGlmKCQoJyNwcmljZVR5cGUnKS52YWwoKSA9PSAnY2xvdWQnKXtcclxuICAgICAgICAkKCcucHJpY2VTZWxlY3RDbG91ZEZpbGUnKS5zaG93KDApO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICAkKCcucHJpY2VTZWxlY3RDbG91ZEZpbGUnKS5oaWRlKDApO1xyXG4gICAgfVxyXG59XHJcblxyXG4kKGZ1bmN0aW9uICgpIHtcclxuICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcucHJpY2UtZ3JvdXAtY3JlYXRlJywgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgJCgnI2Zvcm0tcHJpY2UtZ3JvdXAnKS5kYXRhKCdpZCcsICduZXcnKTtcclxuICAgICAgICAkKCcjY3JlYXRlUHJpY2VHcm91cCcpLm1vZGFsKCdzaG93Jyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAkKGRvY3VtZW50KS5vbignc3VibWl0JywgJyNmb3JtLXByaWNlLWdyb3VwJywgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgZm9ybUxvYWRlclN0YXJ0KCk7XHJcbiAgICAgICAgdmFyIGlkID0gJCh0aGlzKS5kYXRhKCdpZCcpO1xyXG5cclxuXHJcbiAgICAgICAgdmFyIGRhdGEgPSAkKHRoaXMpLnNlcmlhbGl6ZSgpICsgXCImdG9rZW49XCIgKyB0b2tlbjtcclxuICAgICAgICB2YXIgdXJsID0gYXBpVXJsICsgJ3ByaWNlcyc7XHJcblxyXG4gICAgICAgIGlmIChpZCAhPSAnbmV3Jykge1xyXG4gICAgICAgICAgICB1cmwgKz0gJy8nICsgaWQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgICQuYWpheCh7XHJcbiAgICAgICAgICAgIHVybDogdXJsLFxyXG4gICAgICAgICAgICBtZXRob2Q6IFwiUE9TVFwiLFxyXG4gICAgICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxyXG4gICAgICAgICAgICBkYXRhOiBkYXRhLFxyXG4gICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgJCgnI2Zvcm0tcHJpY2UtZ3JvdXAnKS50cmlnZ2VyKFwicmVzZXRcIik7XHJcbiAgICAgICAgICAgICAgICAkKCcjY3JlYXRlUHJpY2VHcm91cCcpLm1vZGFsKCdoaWRlJyk7XHJcbiAgICAgICAgICAgICAgICB0b2FzdHIuc3VjY2VzcyhkYXRhLm1lc3NhZ2UsICfQo9GB0L/QtdGFJyk7XHJcbiAgICAgICAgICAgICAgICBwcmljZXNVcGRhdGUoKTtcclxuICAgICAgICAgICAgICAgIHVwZGF0ZVVJUHJlc2V0cyhkYXRhLnByZXNldHMpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBlcnJvcjoganNFcnJvclxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIH0pO1xyXG5cclxuICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcuYWN0aW9ucy1wcmljZXMgLmFjdGlvbi1lZGl0JywgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgdmFyIGlkID0gJCh0aGlzKS5kYXRhKCdpZCcpO1xyXG4gICAgICAgICQoJyNmb3JtLXByaWNlLWdyb3VwJykuZGF0YSgnaWQnLCBpZCk7XHJcbiAgICAgICAgJC5hamF4KHtcclxuICAgICAgICAgICAgdXJsOiBhcGlVcmwgKyAncHJpY2VzLycgKyBpZCxcclxuICAgICAgICAgICAgbWV0aG9kOiBcIkdFVFwiLFxyXG4gICAgICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxyXG4gICAgICAgICAgICBkYXRhOiB7dG9rZW46IHRva2VufSxcclxuICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICQoJyNmb3JtLXByaWNlLWdyb3VwJykudHJpZ2dlcihcInJlc2V0XCIpO1xyXG4gICAgICAgICAgICAgICAgJCgnI2Zvcm0tcHJpY2UtZ3JvdXAgaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJykucmVtb3ZlQXR0cignY2hlY2tlZCcpO1xyXG4gICAgICAgICAgICAgICAgJCgnI3ByaWNlR3JvdXBOYW1lJykudmFsKGRhdGEubmFtZSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5jaGVja0RvdWJsZSkgJCgnI3ByaWNlR3JvdXBDaGVja0RvdWJsZScpLmF0dHIoJ2NoZWNrZWQnLCAnY2hlY2tlZCcpO1xyXG4gICAgICAgICAgICAgICAgZm9ybUxvYWRlclN0b3AoKTtcclxuICAgICAgICAgICAgICAgICQoJyNjcmVhdGVQcmljZUdyb3VwJykubW9kYWwoJ3Nob3cnKTtcclxuICAgICAgICAgICAgICAgIHVwZGF0ZVVJUHJlc2V0cyhkYXRhLnByZXNldHMpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBlcnJvcjoganNFcnJvclxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIH0pO1xyXG5cclxuICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcucHJpY2VTZWxlY3RDbG91ZEZpbGUnLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICBmaWxlTWFuYWdlck9wZW4oZnMucHJpY2VzLCBbJ3R4dCddLCBmdW5jdGlvbiAocmVzcCkge1xyXG4gICAgICAgICAgICBpZiAoIXJlc3ApIHtcclxuICAgICAgICAgICAgICAgIC8vJCgnI3ByaWNlUGF0aCcpLnZhbCgnJyk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAkKCcjcHJpY2VQYXRoJykudmFsKHJlc3AucGF0aCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG5cclxuXHJcbiAgICAkKGRvY3VtZW50KS5vbignY2hhbmdlJywgJyNwcmljZVR5cGUnLCB1cGRhdGVQcmljZVR5cGVTZWxlY3QpO1xyXG5cclxuICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcuYWN0aW9ucy1wcmljZXMgLmFjdGlvbi1hZGQnLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICB2YXIgaWQgPSAkKHRoaXMpLmRhdGEoJ2lkJyk7XHJcbiAgICAgICAgJCgnI2Zvcm0tcHJpY2UnKS5kYXRhKCdpZCcsICduZXcnKTtcclxuICAgICAgICAkKCcjcHJpY2VQYXJlbnQnKS52YWwoaWQpO1xyXG4gICAgICAgIHVwZGF0ZVByaWNlVHlwZVNlbGVjdCgpO1xyXG4gICAgICAgICQoJyNjcmVhdGVQcmljZScpLm1vZGFsKCdzaG93Jyk7XHJcbiAgICB9KTtcclxuXHJcblxyXG4gICAgJChkb2N1bWVudCkub24oJ3N1Ym1pdCcsICcjZm9ybS1wcmljZScsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIHZhciBpZCA9ICQodGhpcykuZGF0YSgnaWQnKTtcclxuICAgICAgICB2YXIgdXJsID0gYXBpVXJsICsgJ3ByaWNlc1NvdXJjZXMnO1xyXG4gICAgICAgIGlmIChpZCAhPSAnbmV3Jykge1xyXG4gICAgICAgICAgICB1cmwgKz0gJy8nICsgaWQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBkYXRhID0gJCh0aGlzKS5zZXJpYWxpemUoKSArIFwiJnRva2VuPVwiICsgdG9rZW47XHJcbiAgICAgICAgJC5hamF4KHtcclxuICAgICAgICAgICAgdXJsOiB1cmwsXHJcbiAgICAgICAgICAgIG1ldGhvZDogXCJQT1NUXCIsXHJcbiAgICAgICAgICAgIGRhdGFUeXBlOiAnanNvbicsXHJcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXHJcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAkKCcjZm9ybS1wcmljZScpLnRyaWdnZXIoXCJyZXNldFwiKTtcclxuICAgICAgICAgICAgICAgICQoJyNmb3JtLXByaWNlIGlucHV0W3R5cGU9XCJjaGVja2JveFwiXScpLnJlbW92ZUF0dHIoJ2NoZWNrZWQnKTtcclxuICAgICAgICAgICAgICAgICQoJyNjcmVhdGVQcmljZScpLm1vZGFsKCdoaWRlJyk7XHJcbiAgICAgICAgICAgICAgICB0b2FzdHIuc3VjY2VzcyhkYXRhLm1lc3NhZ2UsICfQo9GB0L/QtdGFJyk7XHJcbiAgICAgICAgICAgICAgICBwcmljZXNVcGRhdGUoKTtcclxuICAgICAgICAgICAgICAgIHVwZGF0ZVVJUHJlc2V0cyhkYXRhLnByZXNldHMpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBlcnJvcjoganNFcnJvclxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIH0pO1xyXG5cclxuICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcuYWN0aW9ucy1wcmljZXMtc291cmNlcyAuYWN0aW9uLWVkaXQnLCBmdW5jdGlvbihlKXtcclxuICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICB2YXIgaWQgPSAkKHRoaXMpLmRhdGEoJ2lkJyk7XHJcbiAgICAgICAgJCgnI2Zvcm0tcHJpY2UnKS5kYXRhKCdpZCcsIGlkKTtcclxuICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICB1cmw6IGFwaVVybCArICdwcmljZXNTb3VyY2VzLycgKyBpZCxcclxuICAgICAgICAgICAgbWV0aG9kOiBcIkdFVFwiLFxyXG4gICAgICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxyXG4gICAgICAgICAgICBkYXRhOiB7dG9rZW46IHRva2VufSxcclxuICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICQoJyNmb3JtLXByaWNlJykudHJpZ2dlcihcInJlc2V0XCIpO1xyXG4gICAgICAgICAgICAgICAgJCgnI2Zvcm0tcHJpY2UgaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJykucmVtb3ZlQXR0cignY2hlY2tlZCcpO1xyXG4gICAgICAgICAgICAgICAgJCgnI3ByaWNlUGF0aCcpLnZhbChkYXRhLnNvdXJjZSk7XHJcbiAgICAgICAgICAgICAgICAkKCcjcHJpY2VUeXBlJykudmFsKGRhdGEudHlwZSk7XHJcbiAgICAgICAgICAgICAgICB1cGRhdGVQcmljZVR5cGVTZWxlY3QoKTtcclxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmxhc3RCb3gpICQoJyNwcmljZUxhc3RCb3gnKS5hdHRyKCdjaGVja2VkJywgJ2NoZWNrZWQnKTtcclxuICAgICAgICAgICAgICAgIGZvcm1Mb2FkZXJTdG9wKCk7XHJcbiAgICAgICAgICAgICAgICAkKCcjY3JlYXRlUHJpY2UnKS5tb2RhbCgnc2hvdycpO1xyXG4gICAgICAgICAgICAgICAgdXBkYXRlVUlQcmVzZXRzKGRhdGEucHJlc2V0cyk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGVycm9yOiBqc0Vycm9yXHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxuXHJcblxyXG4gICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJy5hY3Rpb25zLXByaWNlcy1zb3VyY2VzIC5hY3Rpb24tZGVsZXRlJywgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgdmFyIGlkID0gJCh0aGlzKS5kYXRhKCdpZCcpO1xyXG4gICAgICAgIHN3YWwoe1xyXG4gICAgICAgICAgICB0aXRsZTogXCLQktGLINGD0LLQtdGA0LXQvdGLP1wiLFxyXG4gICAgICAgICAgICB0ZXh0OiBcItCt0YLQviDQtNC10LnRgdGC0LLQuNC1INC90LXQvtCx0YDQsNGC0LjQvNC+LiDQo9C00LDQu9C40YLRjCDQuNGB0YLQvtGH0L3QuNC6P1wiLFxyXG4gICAgICAgICAgICB0eXBlOiBcIndhcm5pbmdcIixcclxuICAgICAgICAgICAgY2xvc2VPbkNvbmZpcm06IGZhbHNlLFxyXG4gICAgICAgICAgICBjb25maXJtQnV0dG9uQ29sb3I6IFwiIzJDQThGRlwiLFxyXG4gICAgICAgICAgICBjb25maXJtQnV0dG9uVGV4dDogXCLQo9C00LDQu9C40YLRjFwiLFxyXG4gICAgICAgICAgICBzaG93TG9hZGVyT25Db25maXJtOiB0cnVlLFxyXG4gICAgICAgICAgICBzaG93Q2FuY2VsQnV0dG9uOiB0cnVlLFxyXG4gICAgICAgICAgICBjYW5jZWxCdXR0b25UZXh0OiBcItCe0YLQvNC10L3QsFwiLFxyXG4gICAgICAgIH0sIGZ1bmN0aW9uIChpc0NvbmZpcm0pIHtcclxuICAgICAgICAgICAgaWYgKCFpc0NvbmZpcm0pIHJldHVybjtcclxuICAgICAgICAgICAgJC5hamF4KHtcclxuICAgICAgICAgICAgICAgIHVybDogYXBpVXJsICsgJ3ByaWNlc1NvdXJjZXMvJyArIGlkICsgJy9kZWxldGUnLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJQT1NUXCIsXHJcbiAgICAgICAgICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxyXG4gICAgICAgICAgICAgICAgZGF0YToge3Rva2VuOiB0b2tlbn0sXHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHN3YWwoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogXCLQo9GB0L/QtdGFXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IGRhdGEubWVzc2FnZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJzdWNjZXNzXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpcm1CdXR0b25Db2xvcjogXCIjMkNBOEZGXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcmljZXNVcGRhdGUoKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB1cGRhdGVVSVByZXNldHMoZGF0YS5wcmVzZXRzKTtcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBlcnJvcjoganNFcnJvclxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuXHJcblxyXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcuYWN0aW9ucy1wcmljZXMgLmFjdGlvbi1kZWxldGUnLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIHZhciBpZCA9ICQodGhpcykuZGF0YSgnaWQnKTtcclxuICAgICAgICAgICAgc3dhbCh7XHJcbiAgICAgICAgICAgICAgICB0aXRsZTogXCLQktGLINGD0LLQtdGA0LXQvdGLP1wiLFxyXG4gICAgICAgICAgICAgICAgdGV4dDogXCLQrdGC0L4g0LTQtdC50YHRgtCy0LjQtSDQvdC10L7QsdGA0LDRgtC40LzQvi4g0KPQtNCw0LvQuNGC0Ywg0L/RgNCw0LnRgSDQuCDQstGB0LUg0LXQs9C+INC40YHRgtC+0YfQvdC40LrQuD9cIixcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwid2FybmluZ1wiLFxyXG4gICAgICAgICAgICAgICAgY2xvc2VPbkNvbmZpcm06IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgY29uZmlybUJ1dHRvbkNvbG9yOiBcIiMyQ0E4RkZcIixcclxuICAgICAgICAgICAgICAgIGNvbmZpcm1CdXR0b25UZXh0OiBcItCj0LTQsNC70LjRgtGMXCIsXHJcbiAgICAgICAgICAgICAgICBzaG93TG9hZGVyT25Db25maXJtOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgc2hvd0NhbmNlbEJ1dHRvbjogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGNhbmNlbEJ1dHRvblRleHQ6IFwi0J7RgtC80LXQvdCwXCIsXHJcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChpc0NvbmZpcm0pIHtcclxuICAgICAgICAgICAgICAgIGlmICghaXNDb25maXJtKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICAgICAgICAgIHVybDogYXBpVXJsICsgJ3ByaWNlcy8nICsgaWQgKyAnL2RlbGV0ZScsXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJQT1NUXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcclxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7dG9rZW46IHRva2VufSxcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzd2FsKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiBcItCj0YHQv9C10YVcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IGRhdGEubWVzc2FnZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwic3VjY2Vzc1wiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlybUJ1dHRvbkNvbG9yOiBcIiMyQ0E4RkZcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJpY2VzVXBkYXRlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVVSVByZXNldHMoZGF0YS5wcmVzZXRzKTtcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiBqc0Vycm9yXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgfSk7XHJcblxyXG59KTtcclxuIiwidmFyIGFwcFBhZ2VDdXJyZW50ID0gJ21haW4nO1xyXG52YXIgdG9wcGVkID0gZmFsc2U7XHJcblxyXG5mdW5jdGlvbiB2aWV3UGFnZShwYWdlTmFtZSwgbm9IaXN0b3J5KSB7XHJcbiAgICAkKCcucGFnZScpLmhpZGUoMCk7XHJcbiAgICAkKCcjbmF2aWdhdGlvbiAubmF2LWl0ZW0nKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XHJcbiAgICAkKCcjbmF2aWdhdGlvbiAubmF2LWl0ZW1bZGF0YS1tZW51LXBhZ2U9XCInICsgcGFnZU5hbWUgKyAnXCJdJykuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xyXG4gICAgdmFyIHRpdGxlID0gJCgnI25hdmlnYXRpb24gLm5hdi1pdGVtW2RhdGEtbWVudS1wYWdlPVwiJyArIHBhZ2VOYW1lICsgJ1wiXSBhJykudGV4dCgpO1xyXG4gICAgJCgnLmRhdGEtdGl0bGUnKS50ZXh0KHRpdGxlKTtcclxuICAgICQoJyNwYWdlLScgKyBwYWdlTmFtZSkuc2hvdygwKTtcclxuXHJcbiAgICBpZiAoIW5vSGlzdG9yeSkge1xyXG4gICAgICAgIGhpc3RvcnkucHVzaFN0YXRlKG51bGwsIGRvY3VtZW50LnRpdGxlLCBwYWdlTmFtZSk7XHJcbiAgICB9XHJcbiAgICBjb25zb2xlLmxvZygnQ2hhbmdlIHBhZ2UgJywgYXBwUGFnZUN1cnJlbnQsICc9PicsIHBhZ2VOYW1lKTtcclxuICAgIGRvY3VtZW50LnRpdGxlID0gdGl0bGUgPyB0aXRsZSA6ICdQU0YgUGFuZWwnO1xyXG4gICAgYXBwUGFnZUN1cnJlbnQgPSBwYWdlTmFtZTtcclxuICAgIGlmIChwYWdlTmFtZSA9PSAncHJlc2V0cycpIHtcclxuICAgICAgICBwcmVzZXRzSW5pdCgpO1xyXG4gICAgfSBlbHNlIGlmIChwYWdlTmFtZSA9PSAnY2F0ZWdvcmllcycpIHtcclxuICAgICAgICAvL2NhdGVnb3JpZXNJbml0KCk7XHJcbiAgICB9IGVsc2UgaWYgKHBhZ2VOYW1lID09ICdwcmljZXMnKSB7XHJcbiAgICAgICAgcHJpY2VzSW5pdCgpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBmb3JtTG9hZGVyU3RhcnQoKSB7XHJcbiAgICAkKCcjZm9ybS1sb2FkZXInKS5zaG93KDApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmb3JtTG9hZGVyU3RvcCgpIHtcclxuICAgICQoJyNmb3JtLWxvYWRlcicpLmhpZGUoMCk7XHJcbn1cclxuXHJcbnZhciBtaXNjSW1hZ2VzID0gW107XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVNaXNjSW1hZ2VzKCkge1xyXG4gICAgJC5hamF4KHtcclxuXHJcbiAgICAgICAgdXJsOiBhcGlVcmwgKyAnaW1hZ2VzL21pc2MnLFxyXG4gICAgICAgIG1ldGhvZDogXCJHRVRcIixcclxuICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxyXG4gICAgICAgIGRhdGE6IHt0b2tlbjogdG9rZW59LFxyXG4gICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgIG1pc2NJbWFnZXMgPSBkYXRhO1xyXG5cclxuICAgICAgICAgICAgJCgnaW5wdXQubWlzY2ltYWdlJykuZWFjaChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcmFuZElkID0gbWFrZWlkKCk7XHJcbiAgICAgICAgICAgICAgICAkKHRoaXMpLnNlbGVjdGl6ZSh7XHJcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9uczogZGF0YSxcclxuICAgICAgICAgICAgICAgICAgICBtYXhJdGVtczogMSxcclxuICAgICAgICAgICAgICAgICAgICBsYWJlbEZpZWxkOiAnbmFtZScsXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVGaWVsZDogJ3BhdGgnLFxyXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaEZpZWxkOiBbJ25hbWUnXSxcclxuICAgICAgICAgICAgICAgICAgICByZW5kZXI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9uOiBmdW5jdGlvbiAoaXRlbSwgZXNjYXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJzxkaXYgY2xhc3M9XCJtaXNjLWltYWdlLWl0ZW1cIj4nICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnPGltZyBzcmM9XCInICsgZXNjYXBlKGl0ZW0udXJsKSArICdcIiBhbHQ9XCJcIj4nICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnPHNwYW4gY2xhc3M9XCJuYW1lXCI+JyArIGVzY2FwZShpdGVtLm5hbWUpICsgJzwvc3Bhbj4nICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnPC9kaXY+JztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZXJyb3I6IGpzRXJyb3JcclxuICAgIH0pO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gcmVzZXRNaXNjSW1hZ2VzKCkge1xyXG4gICAgdmFyICRtaXNjaW1hZ2UgPSAkKCdpbnB1dC5taXNjaW1hZ2UnKTtcclxuICAgICRtaXNjaW1hZ2UuZWFjaChmdW5jdGlvbiAoaWR4KSB7XHJcblxyXG4gICAgICAgIGlmICgkKCdpbnB1dC5taXNjaW1hZ2UnKS5zZWxlY3RpemUpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICQodGhpcykuc2VsZWN0aXplKClbMF0uc2VsZWN0aXplLmRlc3Ryb3koKTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgJG1pc2NpbWFnZS5yZW1vdmVDbGFzcygnc2VsZWN0aXplZCcpLnNob3coMCk7XHJcbiAgICAkKCdkaXYubWlzY2ltYWdlJykucmVtb3ZlKCk7XHJcbn1cclxuXHJcbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICBjb25zb2xlLmxvZyh3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3Vic3RyKDEpKTtcclxuICAgIHZpZXdQYWdlKHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zdWJzdHIoMSksIHRydWUpO1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG59KTtcclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVVJUHJlc2V0cyhwcmVzZXRzKSB7XHJcbiAgICBfc2VsZWN0SHRtbCA9ICcnO1xyXG4gICAgY29uc29sZS5sb2cocHJlc2V0cyk7XHJcbiAgICBpZiAocHJlc2V0cy5jb3VudCA8IDEpIHtcclxuICAgICAgICBpZihhcHBQYWdlQ3VycmVudCAhPT0gJ3ByZXNldHMnKSB7XHJcbiAgICAgICAgICAgIHZpZXdQYWdlKCdwcmVzZXRzJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICAkLmVhY2gocHJlc2V0cy5pdGVtcywgZnVuY3Rpb24gKGssIHByZXNldCkge1xyXG4gICAgICAgICAgICBfc2VsZWN0SHRtbCArPSAnPG9wdGlvbiB2YWx1ZT1cIicrIHByZXNldC5pZCArICdcIiAnICsgKHByZXNldC5hY3RpdmUgPyAnc2VsZWN0ZWQnIDogJycpICsgJz4nICsgcHJlc2V0Lm5hbWUgKyAnPC9vcHRpb24+JztcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgICQoJyNwcmVzZXQtc2VsZWN0JykuaHRtbChfc2VsZWN0SHRtbCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxhdW5jaCgpIHtcclxuICAgICQuYWpheCh7XHJcbiAgICAgICAgdXJsOiBhcGlVcmwgKyAndXNlci9tZScsXHJcbiAgICAgICAgbWV0aG9kOiBcIkdFVFwiLFxyXG4gICAgICAgIGRhdGFUeXBlOiAnanNvbicsXHJcbiAgICAgICAgZGF0YToge3Rva2VuOiB0b2tlbn0sXHJcbiAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwidG9rZW5cIiwgdG9rZW4pO1xyXG4gICAgICAgICAgICAkKCcuZGF0YS1hY2NvdW50LW5hbWUnKS50ZXh0KGRhdGEubmFtZSk7XHJcbiAgICAgICAgICAgIHVwZGF0ZVVJUHJlc2V0cyhkYXRhLnByZXNldHMpO1xyXG4gICAgICAgICAgICB2aWV3UGFnZShhcHBQYWdlQ3VycmVudCA9PSAnbG9naW4nID8gJ21haW4nIDogYXBwUGFnZUN1cnJlbnQpO1xyXG5cclxuICAgICAgICAgICAgaGlkZVByZWxvYWRlcigpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZXJyb3I6IGpzRXJyb3JcclxuICAgIH0pO1xyXG4gICAgLy8gdXBkYXRlTWlzY0ltYWdlcygpO1xyXG4gICAgLy8gZmlsZU1hbmFnZXJPcGVuKGZzLnByaWNlcywgW10sIGZ1bmN0aW9uIChyZXNwKSB7XHJcbiAgICAvLyAgICAgaWYoIXJlc3Ape1xyXG4gICAgLy8gICAgICAgICBjb25zb2xlLmxvZygnY2xvc2VkJyk7XHJcbiAgICAvLyAgICAgfSBlbHNlIHtcclxuICAgIC8vICAgICAgICAgY29uc29sZS5sb2cocmVzcCk7XHJcbiAgICAvLyAgICAgfVxyXG4gICAgLy8gfSk7XHJcblxyXG59XHJcblxyXG5mdW5jdGlvbiBsb2dvdXQoKSB7XHJcbiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcInRva2VuXCIsIG51bGwpO1xyXG4gICAgdG9rZW4gPSBudWxsO1xyXG4gICAgaW5pdCgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBoaWRlUHJlbG9hZGVyKCkge1xyXG4gICAgJCgnLnByZWxvYWRlcicpLmZhZGVPdXQoMzAwKTtcclxufVxyXG5cclxuZnVuY3Rpb24gc2hvd1ByZWxvYWRlcigpIHtcclxuICAgICQoJy5wcmVsb2FkZXInKS5mYWRlSW4oMzAwKTtcclxufVxyXG5cclxuXHJcbiQoZnVuY3Rpb24gKCkge1xyXG4gICAgYXBwUGFnZUN1cnJlbnQgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3Vic3RyKDEpLmxlbmd0aCA/IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zdWJzdHIoMSkgOiAnbWFpbic7XHJcbiAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnLm1lbnUtbGluaycsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIHZhciBpZCA9ICQodGhpcykuYXR0cignaHJlZicpLnN1YnN0cigxKTtcclxuXHJcbiAgICAgICAgdmlld1BhZ2UoaWQpO1xyXG4gICAgICAgICQoXCIjYm9keUNsaWNrXCIpLnRyaWdnZXIoJ2NsaWNrJyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAkKGRvY3VtZW50KS5vbignc3VibWl0JywgXCIjZm9ybS1sb2dpblwiLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICB2YXIgZGF0YSA9ICQodGhpcykuc2VyaWFsaXplKCkgKyBcIiZ0b2tlbj1cIiArIHRva2VuO1xyXG4gICAgICAgICQuYWpheCh7XHJcbiAgICAgICAgICAgIHVybDogYXBpVXJsICsgJ2F1dGgnLFxyXG4gICAgICAgICAgICBtZXRob2Q6IFwiUE9TVFwiLFxyXG4gICAgICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxyXG4gICAgICAgICAgICBkYXRhOiBkYXRhLFxyXG4gICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgdG9rZW4gPSBkYXRhLnRva2VuO1xyXG4gICAgICAgICAgICAgICAgc2hvd1ByZWxvYWRlcigpO1xyXG4gICAgICAgICAgICAgICAgbGF1bmNoKCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGVycm9yOiBqc0Vycm9yXHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnLmxvZ291dCcsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIGxvZ291dCgpO1xyXG4gICAgfSk7XHJcbiAgICBzeW5jU2Nyb2xsKCk7XHJcblxyXG5cclxuICAgIFB1bGxUb1JlZnJlc2guaW5pdCh7XHJcbiAgICAgICAgbWFpbkVsZW1lbnQ6ICcjYycsIC8vIGFib3ZlIHdoaWNoIGVsZW1lbnQ/XHJcbiAgICAgICAgcGFzc2l2ZTogZmFsc2UsXHJcbiAgICAgICAgc2hvdWxkUHVsbFRvUmVmcmVzaDogZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgcmV0dXJuICEkKCdib2R5JykuaGFzQ2xhc3MoJ21vZGFsLW9wZW4nKSAmJiB0b3BwZWQ7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBvblJlZnJlc2g6IGZ1bmN0aW9uIChkb25lKSB7XHJcbiAgICAgICAgICAgIHZpZXdQYWdlKGFwcFBhZ2VDdXJyZW50KVxyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGRvbmUoKTsgLy8gZW5kIHB1bGwgdG8gcmVmcmVzaFxyXG4gICAgICAgICAgICB9LCAxNTAwKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuXHJcblxyXG5cclxufSk7XHJcblxyXG5mdW5jdGlvbiBzeW5jU2Nyb2xsKCkge1xyXG4gICAgdmFyIHNjcm9sbGVkID0gd2luZG93LnBhZ2VZT2Zmc2V0IHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxUb3A7XHJcbiAgICB2YXIgX29sZFRvcHBlZCA9IHRvcHBlZDtcclxuICAgIGlmIChzY3JvbGxlZCA+PSA2Mykge1xyXG4gICAgICAgIHRvcHBlZCA9IGZhbHNlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB0b3BwZWQgPSB0cnVlO1xyXG4gICAgfVxyXG4gICAgaWYgKHRvcHBlZCAhPSBfb2xkVG9wcGVkKSB7XHJcbiAgICAgICAgaWYgKHRvcHBlZCkge1xyXG4gICAgICAgICAgICAkKCdib2R5JykuYWRkQ2xhc3MoJ3RvcHBlZCcpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICQoJ2JvZHknKS5yZW1vdmVDbGFzcygndG9wcGVkJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG53aW5kb3cub25zY3JvbGwgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBzeW5jU2Nyb2xsKCk7XHJcblxyXG5cclxufTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
