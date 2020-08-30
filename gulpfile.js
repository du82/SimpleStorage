process.env.DISABLE_NOTIFIER = true;

var elixir = require('laravel-elixir');
require('laravel-elixir-rollup');

elixir.config.sourcemaps = false;
elixir.config.assetsPath = 'assets';
elixir.config.css.sass.pluginOptions.includePaths = ['node_modules'];

var production = elixir.config.production;

var banner =
    '/**\n' +
    ' * Copyright (c) ' + new Date().getFullYear() + ' Du\n' +
    ' */';

elixir(function (mix) {
    // Compile Sass
    ['demo', 'fileicons', 'filepicker'].forEach(function (file) {
        if (!production) {
            mix.sass(file + '.scss', 'assets/css/' + file + '.css');
        }
    });

    // Compile Scripts
    ['', 'ui', 'drop', 'crop', 'camera'].forEach(function (plugin) {
        var options = {
            format: 'umd',
            banner: banner,
            // sourceMapFile: !production,
            globals: {jquery: 'jQuery', filepicker: 'Filepicker'}
        };

        var src = 'src/';
        var output = 'assets/js/filepicker';

        if (plugin == '') {
            options.moduleName = 'Filepicker';
        } else {
            src += 'plugins/' + plugin + '/';
            output += '-' + plugin;
        }

        output += production ? '.min.js' : '.js';

        mix.rollup(src + 'index.js', output, options);
    });
});
