<?php

session_start();

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
$config['accept_file_types'] = 'jpg|jpeg|png|gif';
$config['keep_original_image'] = true;
$config['image_versions.avatar'] = array(
    'width' => 300,
    'height' => 300,
);

// Here you may get the a user id from session.
$userId = 1;

// Events

/**
 * Fired before the file upload starts.
 *
 * @param \Symfony\Component\HttpFoundation\File\UploadedFile $file
 */
$handler->on('upload.before', function ($file) use ($userId) {
    // Save the avatar to a temporary file.
    $file->save = '~avatar' . $userId;
});

/**
 * Fired before cropping.
 *
 * @param \Symfony\Component\HttpFoundation\File\File $file
 * @param \Intervention\Image\Image $image
 */
$handler->on('crop.before', function ($file, $image) use ($userId) {
    // Check if the user is allowed the crop the image
    // throw new \Hazzard\Filepicker\Exception\AbortException('Not allowed');

    $file->save = 'avatar' . $userId;
});

/**
 * Fired after cropping.
 *
 * @param \Symfony\Component\HttpFoundation\File\File $file
 * @param \Intervention\Image\Image $image
 */
$handler->on('crop.after', function ($file, $image) {
    // Here you may save/update the image into database.
    $_SESSION['avatar'] = $file->getFilename();
});

/**
 * Fired on file deletion.
 *
 * @param \Symfony\Component\HttpFoundation\File\File $file
 */
$handler->on('file.delete', function ($file) {
    // Here you may delete the image from database.
    unset($_SESSION['avatar']);
});

// Handle the request.
$handler->handle()->send();
