/**
 * This file is part of Filepicker.
 * 
 * Copyright (c) 2016 Cretu Eusebiu <hazzardweb@gmail.com>
 *
 * For the full copyright and license information, please visit:
 * http://codecanyon.net/licenses/standard
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(require('jquery'), require('filepicker')) :
  typeof define === 'function' && define.amd ? define(['jquery', 'filepicker'], factory) :
  (factory(global.jQuery,global.Filepicker));
}(this, function ($,Filepicker) { 'use strict';

  $ = 'default' in $ ? $['default'] : $;
  Filepicker = 'default' in Filepicker ? Filepicker['default'] : Filepicker;

  /*
   * JavaScript Templates
   * https://github.com/blueimp/JavaScript-Templates
   *
   * Copyright 2011, Sebastian Tschan
   * https://blueimp.net
   *
   * Licensed under the MIT license:
   * http://www.opensource.org/licenses/MIT
   *
   * Inspired by John Resig's JavaScript Micro-Templating:
   * http://ejohn.org/blog/javascript-micro-templating/
   */

  /*eslint-disable*/

  // ;(function ($) {
  // 'use strict'
  var tmpl = function tmpl(str, data) {
    var f = !/[^\w\-\.:]/.test(str) ? tmpl.cache[str] = tmpl.cache[str] || tmpl(tmpl.load(str)) : new Function( // eslint-disable-line no-new-func
    tmpl.arg + ',tmpl', 'var _e=tmpl.encode' + tmpl.helper + ",_s='" + str.replace(tmpl.regexp, tmpl.func) + "';return _s;");
    return data ? f(data, tmpl) : function (data) {
      return f(data, tmpl);
    };
  };
  tmpl.cache = {};
  tmpl.load = function (id) {
    return document.getElementById(id).innerHTML;
  };
  tmpl.regexp = /([\s'\\])(?!(?:[^{]|\{(?!%))*%\})|(?:\{%(=|#)([\s\S]+?)%\})|(\{%)|(%\})/g;
  tmpl.func = function (s, p1, p2, p3, p4, p5) {
    if (p1) {
      // whitespace, quote and backspace in HTML context
      return {
        '\n': '\\n',
        '\r': '\\r',
        '\t': '\\t',
        ' ': ' '
      }[p1] || '\\' + p1;
    }
    if (p2) {
      // interpolation: {%=prop%}, or unescaped: {%#prop%}
      if (p2 === '=') {
        return "'+_e(" + p3 + ")+'";
      }
      return "'+(" + p3 + "==null?'':" + p3 + ")+'";
    }
    if (p4) {
      // evaluation start tag: {%
      return "';";
    }
    if (p5) {
      // evaluation end tag: %}
      return "_s+='";
    }
  };
  tmpl.encReg = /[<>&"'\x00]/g;
  tmpl.encMap = {
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&#39;'
  };
  tmpl.encode = function (s) {
    return (s == null ? '' : '' + s).replace(tmpl.encReg, function (c) {
      return tmpl.encMap[c] || '';
    });
  };
  tmpl.arg = 'o';
  tmpl.helper = ",print=function(s,e){_s+=e?(s==null?'':s):_e(s);}" + ',include=function(s,d){_s+=tmpl(s,d);}';

  var defaults = {
      ui: {
          autoLoad: true,
          autoUpload: true,
          perPage: 15,
          refreshPagination: false,
          prependFiles: true,
          previewThumbnailSize: [64, 64],
          timeago: false,
          // startAll: undefined,
          // cancelAll: undefined,
          // deleteAll: undefined,
          // filesList: undefined,
          // pagination: undefined,
          selectors: {
              filesList: '.files',
              preview: '.preview',
              progress: '.progress-bar',
              error: '.error',
              start: '.start',
              cancel: '.cancel',
              'delete': '.delete',
              startAll: '.start-all',
              cancelAll: '.cancel-all',
              deleteAll: '.delete-all',
              pagination: '.pagination-container'
          },
          uploadTemplateId: 'uploadTemplate',
          downloadTemplateId: 'downloadTemplate',
          paginationTemplateId: 'paginationTemplate'
      },

      messages: {
          processing: 'Processing...',
          deleteFail: 'Could not delete file :file.'
      },

      /**
       * Add handler.
       *
       * @param {Object} e
       * @param {Object} data
       */
      add: function add(e, data) {
          if (e.isDefaultPrevented()) {
              return false;
          }

          this.trigger('renderupload', e, data);

          if (this.options.ui.autoUpload || data.autoUpload) {
              this.onSend(e, data);
          }
      },

      /**
       * Progress handler.
       *
       * @param {Object} e
       * @param {Object} data
       */
      progress: function progress(e, data) {
          var _this = this;

          if (e.isDefaultPrevented()) {
              return false;
          }

          $.each(data.files, function (_, file) {
              var p = data.progress.percentage;

              file.context.find(_this.options.ui.selectors.progress).text(p === 100 ? _this.trans('processing') : p + '%').css('width', p + '%');
          });
      },

      /**
       * Upload done handler.
       *
       * @param {Object} e
       * @param {Object} data
       */
      done: function done(e, data) {
          if (e.isDefaultPrevented()) {
              return false;
          }

          this.trigger('renderdownload', e, data);
      },

      /**
       * Upload fail handler.
       *
       * @param {Object} e
       * @param {Object} data
       */
      fail: function fail(e, data) {
          var _this2 = this;

          if (e.isDefaultPrevented()) {
              return false;
          }

          var s = this.options.ui.selectors;

          $.each(data.files, function (_, file) {
              file.context.find(s.error).text(_this2.trans(data.errorThrown));
              file.context.find(s.progress).text('').css('width', '0%');
              file.context.find(s.start).prop('disabled', false);
          });
      },

      /**
       * Upload always handler.
       *
       * @param {Object} e
       * @param {Object} data
       */
      always: function always(e, data) {
          var _this3 = this;

          $.each(data.files, function (_, file) {
              file.context.find(_this3.options.ui.selectors.progress).parent().hide();
          });

          if (this._sending == 0 && this.options.ui.refreshPagination) {
              this.plugins.ui.fetchFiles();
          }
      },

      /**
       * Files load handler.
       *
       * @param {Object} e
       * @param {Object} data
       */
      load: function load(e, data) {
          if (e.isDefaultPrevented()) {
              return false;
          }

          this.trigger('renderdownload', e, data);
      },

      /**
       * Start upload handler.
       *
       * @param {Object} e
       * @param {Object} data
       */
      start: function start(e, data) {
          var _this4 = this;

          if (e.isDefaultPrevented()) {
              $.each(data.files, function (_, file) {
                  file.context.find(_this4.options.ui.selectors.start).prop('disabled', false);
              });
          } else {
              this.onSend(e, data);
          }
      },

      /**
       * Cancel upload handler.
       *
       * @param {Object} e
       * @param {Object} data
       */
      cancel: function cancel(e, data) {
          if (e.isDefaultPrevented()) {
              return false;
          }

          $.each(data.files, function (_, file) {
              return file.context.remove();
          });
      },

      /**
       * Render uploaded file.
       *
       * @param {Object} e
       * @param {Object} data
       */
      renderupload: function renderupload(e, data) {
          var _this5 = this;

          $.each(data.files, function (_, file) {
              file.autoUpload = _this5.options.ui.autoUpload;

              file.context = _this5.plugins.ui.renderTemplate(_this5.options.ui.uploadTemplateId, { file: file });

              file.context.data('data', data);

              if (file.imageFile) {
                  _this5.plugins.ui.renderThumbnailPreview(file);
              }

              var method = _this5.options.ui.prependFiles ? 'prepend' : 'append';

              _this5.options.ui.filesList[method](file.context);

              file.context.addClass('in');
          });

          this.trigger('renderdone', e, data);
      },

      /**
       * Render download file.
       *
       * @param {Object} e
       * @param {Object} data
       */
      renderdownload: function renderdownload(e, data) {
          var _this6 = this;

          $.each(data.files, function (_, file) {
              _this6.addProps(file);

              file.context = _this6.plugins.ui.renderTemplate(_this6.options.ui.downloadTemplateId, { file: file });

              file.context.find(_this6.options.ui.selectors['delete']).data('filename', file.name);

              if (file.original) {
                  file.original.context.removeClass('in');
                  file.original.context.replaceWith(file.context);
                  file.context.data('data', data);
              } else {
                  _this6.options.ui.filesList.append(file.context);
              }

              file.context.addClass('in');
          });

          this.trigger('renderdone', e, data);
      },

      /**
       * Render done handler.
       *
       * @param {Object} e
       * @param {Object} data
       */
      renderdone: function renderdone(e, data) {
          if (this.options.ui.timeago && $.fn.timeago) {
              $.each(data.files, function (_, file) {
                  file.context.find('time').timeago();
              });
          }
      },

      /**
       * Render pagination handler.
       *
       * @param {Object} e
       * @param {Objct} data
       */
      renderpagination: function renderpagination(e, data) {
          this.options.filesList.children().remove();

          this.options.pagination.html(this.renderTemplate(this.options.paginationTemplateId, data));
      },

      /**
       * File delete handler.
       *
       * @param {Object} e
       * @param {Object} data {context:, filename:}
       */
      'delete': function _delete(e, data) {
          var _this7 = this;

          if (e.isDefaultPrevented()) {
              return false;
          }

          this['delete'](data.filename).done(function (_, __, jqXHR) {
              return _this7.trigger('deletedone', e, [data, jqXHR]);
          }).fail(function (jqXHR) {
              return _this7.trigger('deletefail', e, [data, jqXHR]);
          }).always(function (datajqXHR) {
              return _this7.trigger('deletealways', e, [data, datajqXHR]);
          });
      },

      /**
       * Delete done handler.
       *
       * @param {Object} e
       * @param {Object} data {context:, filename:}
       * @param {Object} jqXHR
       */
      deletedone: function deletedone(e, data, jqXHR) {
          if (e.isDefaultPrevented()) {
              return false;
          }

          if (jqXHR.responseJSON[data.filename] !== true) {
              return this.trigger('deletefail', e, [data, jqXHR]);
          }

          if (data.context) {
              data.context.remove();
          }

          if (this.options.ui.pagination && this.options.ui.filesList.children().length == 0) {
              this.plugins.ui.fetchFiles(-1);
          }
      },

      /**
       * Delete fail handler.
       *
       * @param {Object} e
       * @param {Object} data {context:, filename:}
       */
      deletefail: function deletefail(e, data) {
          if (e.isDefaultPrevented()) {
              return false;
          }

          alert(this.trans('deleteFail', { file: data.filename }));
      },

      /**
       * Start all handler.
       *
       * @param {Object} e
       */
      startall: function startall(e) {
          if (e.isDefaultPrevented()) {
              return false;
          }

          this.options.ui.filesList.find(this.options.ui.selectors.start).trigger('click');
      },

      /**
       * Cancel all handler.
       *
       * @param {Object} e
       */
      cancelall: function cancelall(e) {
          if (e.isDefaultPrevented()) {
              return false;
          }

          this.options.ui.filesList.find(this.options.ui.selectors.cancel).trigger('click');
      },

      /**
       * Delete all handler.
       *
       * @param {Object} e
       */
      deleteall: function deleteall(e) {
          if (e.isDefaultPrevented()) {
              return false;
          }

          this.options.ui.filesList.find(this.options.ui.selectors['delete']).trigger('click');
      }
  };

  /**
   * Create a new plugin instance.
   *
   * @param {Filepicker} filepicker
   */
  function UI(filepicker) {
      filepicker.extend(this, defaults);
  }

  /**
   * Initialize.
   */
  UI.prototype.init = function () {
      var _this = this;

      this.options = this.$f.options.ui;

      var o = this.options;
      var el = this.$f.element;
      var s = this.options.selectors;

      if (!o.filesList) {
          o.filesList = el.find(s.filesList);
      }

      if (!o.pagination) {
          o.pagination = el.find(s.pagination);
      }

      this.on(o.filesList, 'click', s.start, this.onStart);
      this.on(o.filesList, 'click', s.cancel, this.onCancel);
      this.on(o.filesList, 'click', s['delete'], this.onDelete);

      this.on(o.startAll || el, 'click', o.startAll ? null : s.startAll, this.onStartAll);
      this.on(o.cancelAll || el, 'click', o.cancelAll ? null : s.cancelAll, this.onCancelAll);
      this.on(o.deleteAll || el, 'click', o.deleteAll ? null : s.deleteAll, this.onDeleteAll);

      this._currentPage = 1;

      if (o.autoLoad) {
          if (o.perPage) {
              this.on(this.options.pagination, 'click', 'a', this.onPageClick);
              this.fetchFiles();
          } else {
              this.$f.fetch().done(function (result) {
                  _this.$f.trigger('load', null, result);
              });
          }
      }
  };

  /**
   * On page click handler.
   *
   * @param {Object} e
   */
  UI.prototype.onPageClick = function (e) {
      e.preventDefault();

      var page = parseInt($(e.target).data('page'));

      if (page) {
          this.fetchFiles(page);
      }
  };

  /**
   * Fetch files.
   *
   * @param {Number} page
   */
  UI.prototype.fetchFiles = function () {
      var _this2 = this;

      var page = arguments.length <= 0 || arguments[0] === undefined ? 1 : arguments[0];

      this._currentPage = page == -1 ? this._currentPage - 1 : page;

      if (this._currentPage < 1) {
          this._currentPage = 1;
      }

      var options = {
          limit: this.options.perPage,
          offset: this._currentPage * this.options.perPage - this.options.perPage
      };

      this.$f.fetch(options).done(function (result) {
          _this2.renderPagination(result);
      });
  };

  /**
   * Render pagination.
   *
   * @param {Object} result {files: [], total: 0}
   */
  UI.prototype.renderPagination = function (result) {
      var firstAdj = 0;
      var lastAdj = 0;
      var span = 1;
      var currentPage = this._currentPage;
      var lastPage = Math.ceil(result.total / this.options.perPage);
      var prevPage = currentPage > 1 ? currentPage - 1 : null;
      var nextPage = lastPage > currentPage ? currentPage + 1 : null;

      if (currentPage <= span * 2) {
          firstAdj = 1;
          lastAdj = Math.min(1 + 2 * span, lastPage);
      } else if (currentPage > lastPage - 2 * span) {
          firstAdj = lastPage - 2 * span;
          lastAdj = lastPage;
      } else {
          firstAdj = currentPage - span;
          lastAdj = currentPage + span;
      }

      var data = {
          total: result.total,
          currentPage: currentPage,
          prevPage: prevPage,
          nextPage: nextPage,
          lastPage: lastPage,
          firstAdjacentPage: firstAdj,
          lastAdjacentPage: lastAdj
      };

      this.$f.trigger('renderpagination', null, data, this);
      this.$f.trigger('load', null, result);
  };

  /**
   * Start file upload event handler.
   *
   * @param {Object} e
   */
  UI.prototype.onStart = function (e) {
      e.preventDefault();

      var button = $(e.currentTarget);
      var item = button.closest('.upload-template');
      var data = item.data('data');

      button.prop('disabled', true);

      if (data && data.send) {
          this.$f.trigger('start', e, data);
      }
  };

  /**
   * Cancel upload event handler.
   *
   * @param {Object} e
   */
  UI.prototype.onCancel = function (e) {
      e.preventDefault();

      var item = $(e.currentTarget).closest('.upload-template,.download-template');
      var data = item.data('data') || {};

      if (data.abort) {
          data.abort();
      }

      this.$f.trigger('cancel', e, data);
  };

  /**
   * Delete file event handler.
   *
   * @param {Object} e
   */
  UI.prototype.onDelete = function (e) {
      e.preventDefault();

      var button = $(e.currentTarget);

      this.$f.trigger('delete', e, {
          filename: button.data('filename'),
          context: button.closest('.download-template')
      });
  };

  /**
   * Start all file uploads event handler.
   *
   * @param {Object} e
   */
  UI.prototype.onStartAll = function (e) {
      e.preventDefault();
      this.$f.trigger('startall', e);
  };

  /**
   * Cancel all file upload event handler.
   *
   * @param {Object} e
   */
  UI.prototype.onCancelAll = function (e) {
      e.preventDefault();
      this.$f.trigger('cancelall', e);
  };

  /**
   * Delete all files event handler.
   *
   * @param {Object} e
   */
  UI.prototype.onDeleteAll = function (e) {
      e.preventDefault();
      this.$f.trigger('deleteall', e);
  };

  /**
   * Render template.
   *
   * @param  {String} templateId
   * @param  {Object} data
   * @return {Object} jQuery object
   */
  UI.prototype.renderTemplate = function (templateId, data) {
      return $(tmpl(templateId, data));
  };

  /**
   * Render image thumbnail preview.
   *
   * @param {Object} file
   */
  UI.prototype.renderThumbnailPreview = function (file) {
      var _this3 = this;

      var canvas = document.createElement('canvas');
      var context = canvas.getContext('2d');
      var image = new Image();

      canvas.width = this.options.previewThumbnailSize[0];
      canvas.height = this.options.previewThumbnailSize[1];

      image.onload = function () {
          context.drawImage(image, 0, 0, 80, 80 * image.height / image.width);
          file.context.find(_this3.options.selectors.preview).html(canvas);
      };

      image.src = window.URL.createObjectURL(file);
  };

  /**
   * Register the plugin.
   */
  Filepicker.plugin('ui', UI);

}));