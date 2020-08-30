<?php

use Hazzard\Filepicker\Handler;
use Hazzard\Filepicker\Uploader;
use Intervention\Image\ImageManager;
use Hazzard\Config\Repository as Config;

// Include composer autoload
require __DIR__.'/../vendor/autoload.php';

$uploader = new Uploader($config = new Config, new ImageManager(array('driver' => 'gd')));
$handler = new Handler($uploader);

// Configuration

$config['debug'] = true;
$config['upload_dir'] = __DIR__.'/../files';
// $config['upload_url'] = 'files';
$config['image_versions.thumb'] = array(
    'width' => 120,
    'height' => 120
);

// Events

/**
 * Fired before the file upload starts.
 *
 * @param \Symfony\Component\HttpFoundation\File\UploadedFile $file
 */
$handler->on('upload.before', function ($file) {
    // $file->save = 'file';
    // throw new \Hazzard\Filepicker\Exception\AbortException('Error message!');
});

/**
 * Fired on upload success.
 *
 * @param \Symfony\Component\HttpFoundation\File\File $file
 */
$handler->on('upload.success', function ($file) {

});

/**
 * Fired on upload error.
 *
 * @param \Symfony\Component\HttpFoundation\File\UploadedFile $file
 */
$handler->on('upload.error', function ($file) {

});

/**
 * Fired when fetching files.
 *
 * @param array &$files
 */
$handler->on('files.fetch', function (&$files) {
    // Set the array of files to be returned.
    // $files = array('file1', 'file2', 'file3');
});

/**
 * Fired on file filtering.
 *
 * @param array &$files
 * @param int   &$total
 */
$handler->on('files.filter', function (&$files, &$total) {

});

/**
 * Fired on file download.
 *
 * @param \Symfony\Component\HttpFoundation\File\File $file
 * @param string $version
 */
$handler->on('file.download', function ($file, $version) {

});

/**
 * Fired on file deletion.
 *
 * @param \Symfony\Component\HttpFoundation\File\File $file
 */
$handler->on('file.delete', function ($file) {

});

/**
 * Fired before cropping.
 *
 * @param \Symfony\Component\HttpFoundation\File\File $file
 * @param \Intervention\Image\Image $image
 */
$handler->on('crop.before', function ($file, $image) {

});

/**
 * Fired after cropping.
 *
 * @param \Symfony\Component\HttpFoundation\File\File $file
 * @param \Intervention\Image\Image $image
 */
$handler->on('crop.after', function ($file, $image) {

});

// Handle the request.
$handler->handle()->send();
