const { src, dest, watch, parallel, series } = require('gulp');
const scss = require('gulp-sass')(require('sass'));
const autoprefixer = require('gulp-autoprefixer');
const sourcemaps = require('gulp-sourcemaps');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify-es').default;
const browserSync = require('browser-sync').create();
const imagemin = require('gulp-imagemin');
const svgSprite = require('gulp-svg-sprite');
const del = require('del');
const gcmq = require('gulp-group-css-media-queries');
const babel = require('gulp-babel');
const twig = require('gulp-twig');
const htmlbeautify = require('gulp-html-beautify');

function formaterHtml() {
	return src('app/*.html')
		.pipe(htmlbeautify({
			indentSize: 2,
			"preserve_newlines": false,
			"max_preserve_newlines": 1,
		}))
		.pipe(dest('dist'))
}

function compile() {
	return src([
		'./app/templates/*.twig'
	])
		.pipe(twig({
			errorLogToConsole: true,
			data: {
				title: 'Avtobis',
			},
			functions: [
				{
					name: "getClassMix",
					func: function (blockClass, elemClass, separator = "__") {
						if (typeof blockClass.trim() === ''
							|| typeof elemClass.trim() === '') {
							return ''
						}

						return Array.from(arguments).join(separator);
					}
				},
				// random Integer
				{
					name: "randomInteger",
					func: function (min = 0, max = 9999) {
						let rand = min + Math.random() * (max + 1 - min);
						return Math.floor(rand);
					}
				},
				{
					name: "getClassMod",
					func: function (elemClass, modClass, separator = "--") {
						if (typeof elemClass.trim() === ''
							|| typeof modClass.trim() === '') {
							return ''
						}

						return Array.from(arguments).join(separator);
					}
				},
				{
					name: "getCommonStr",
					func: function () {
						return Array.from(arguments).join(' ').trim();
					}, function(elemClass, modClass, separator = "--") {
						if (typeof elemClass.trim() === ''
							|| typeof modClass.trim() === '') {
							return ''
						}

						return Array.from(arguments).join(separator);
					}
				},
				// createBemClass
				{
					name: "createBemClass",
					func: function (baseClass, objClasses = {}) {
						const { beforeClass, mixs, mods, ...dop } = objClasses;
						let _mixClass = "",
							_modClass = "",
							_beforeClass = "",
							_dopClass = "";

						if (baseClass) {
							if (mixs) _mixClass = _createMixClass(baseClass, mixs);
							if (mods) _modClass = _createModClass(baseClass, mods);
						}

						if (dop) {
							_dopClass = _generateClass(dop);
						}

						if (beforeClass) {
							_beforeClass = _generateClass(beforeClass);
						}

						function _createModClass(base, branch, separator = "--") {
							let result = [];

							if (typeof branch === 'string') {
								branch = String(branch);
								branch = branch.split(/,\s*/);
							}

							if (branch.length > 0) {
								result = branch.map(function (_class) {
									return `${base}${separator}${_class.trim()}`;
								});
							}

							return result.join(' ');
						}

						function _createMixClass(base, branch, separator = "__") {
							let result = [];

							if (typeof branch === 'string') {
								branch = String(branch);
								branch = branch.split(/,\s*/);
							}

							if (branch.length > 0) {
								result = branch.map(function (_class) {
									return `${_class.trim()}${separator}${base}`;
								});
							}

							return result.join(' ');
						}

						function _generateClass(classes) {
							let result = '';

							if (typeof classes === 'object') {
								const keys = Object.keys(classes);

								result = keys.map(function (key) {
									if (key !== '_keys') {
										return String(dop[key]).split(/,\s*/).join(' ');
									}
								})
							} else {
								result = String(classes).split(/,\s*/);
							}


							return result.join(' ').trim();
						}

						return [_beforeClass, _mixClass, baseClass, _modClass, _dopClass].join(' ').replace(/\s{2,}/, ' ').trim();
					}
				}
			]
		}))
		.pipe(dest('app/'));
}

function svgSprites() {
	return src('app/assets/img/icons/sprite/all/*.svg')
		.pipe(svgSprite({
			mode: {
				stack: {
					sprite: '../sprite.svg'
				}
			}
		}))
		.pipe(dest('app/assets/img/icons/sprite'))
}

function browsersync() {
	browserSync.init({
		server: {
			baseDir: "./app/"
		}
	});
}

function cleanDist() {
	return del('dist')
}

function images() {
	return src('app/assets/img/**/*')
		.pipe(imagemin([
			imagemin.gifsicle({ interlaced: true }),
			imagemin.mozjpeg({ quality: 75, progressive: true }),
			imagemin.optipng({ optimizationLevel: 5 }),
			imagemin.svgo({
				plugins: [
					{ removeViewBox: true },
					{ cleanupIDs: false }
				]
			})
		]))
		.pipe(dest('dist/assets/img'))
}

function scripts() {
	return src([
		'app/assets/js/index.js'
	])
		.pipe(sourcemaps.init())
		.pipe(concat('main.js'))
		//.pipe(uglify())
		.pipe(babel())
		.pipe(sourcemaps.write())
		.pipe(dest('app/assets/js'))
		.pipe(browserSync.stream())
}

function scriptsBuild() {
	return src([
		'app/assets/js/index.js'
	])
		.pipe(concat('main.js'))
		.pipe(babel())
		.pipe(uglify())
		.pipe(dest('dist/assets/js'));
}

function styles() {
	return src('app/assets/style/scss/main.scss')
		.pipe(sourcemaps.init())
		.pipe(scss())
		.pipe(concat('style.css'))
		.pipe(sourcemaps.write())
		.pipe(dest('app/assets/style/css'))
		.pipe(browserSync.stream());
}

function stylesBuild() {
	return src('app/assets/style/scss/main.scss')
		.pipe(scss({ outputStyle: 'compressed' }))
		.pipe(concat('style.css'))
		.pipe(autoprefixer({
			overrideBrowserslist: ['last 5 version'],
			grid: true
		}))
		.pipe(dest('dist/assets/style/css'));
}

function build() {
	return src([
		'app/assets/fonts/**/*',
		'app/assets/style/css/libs/**/*',
		'app/assets/js/libs/**/*',
		'app/assets/vendors/**/*',
	], { base: 'app' })
		.pipe(dest('dist'))
}

function watching() {
	watch(['app/assets/style/scss/**/*.scss'], styles);
	watch(['app/templates/**/*.twig'], compile);
	watch(['app/assets/js/**/*.js', '!app/assets/js/main.js'], scripts);
	watch(['app/*.html']).on('change', browserSync.reload);
	watch(['app/assets/img/spriteSvg/unification/*.svg'], svgSprites);
}

exports.compile = compile;
exports.formaterHtml = formaterHtml;
exports.styles = styles;
exports.stylesBuild = stylesBuild;
exports.scriptsBuild = scriptsBuild;
exports.svgSprite = svgSprites;
exports.watching = watching;
exports.browsersync = browsersync;
exports.scripts = scripts;
exports.images = images;
exports.cleanDist = cleanDist;

exports.build = series(cleanDist, compile, formaterHtml, images, build, stylesBuild, scriptsBuild);

exports.default = parallel(compile, styles, scripts, svgSprites, browsersync, watching);