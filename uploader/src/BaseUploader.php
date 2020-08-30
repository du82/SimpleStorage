<?php

/**
 * This file is part of Filepicker.
 *
 * (c) HazzardWeb <hazzardweb@gmail.com>
 *
 * For the full copyright and license information, please visit:
 * http://codecanyon.net/licenses/standard
 */

namespace Hazzard\Filepicker;

use Intervention\Image\ImageManager;
use Hazzard\Config\Repository as Config;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Hazzard\Filepicker\Exception\FileValidationException;
use Symfony\Component\HttpFoundation\File\Exception\FileException;
use Symfony\Component\HttpFoundation\File\Exception\UploadException;
use Symfony\Component\HttpFoundation\File\Exception\FileNotFoundException;

class BaseUploader
{
    /**
     * File sorting codes.
     *
     * @var int
     */
    const SORT_FILEMTIME_ASC = 1;
    const SORT_FILEMTIME_DESC = 2;
    const SORT_FILESIZE_ASC = 3;
    const SORT_FILESIZE_DESC = 4;
    const SORT_FILENAME_ASC = 5;
    const SORT_FILENAME_DESC = 6;

    /**
     * The configuration repository instance.
     *
     * @var \Hazzard\Config\Repository
     */
    protected $config;

    /**
     * The Intervention Image Manager.
     *
     * @var \Intervention\Image\ImageManager
     */
    protected $imageManager;

    /**
     * Create a new uploader instance.
     *
     * @param  \Hazzard\Config\Repository $config
     * @param  \Intervention\Image\ImageManager|null $imageManager
     * @return void
     */
    public function __construct(Config $config, $imageManager = null)
    {
        $this->config = $config;
        $this->imageManager = $imageManager;

        $this->defaultConfig();
    }

    /**
     * Upload the given file.
     *
     * @param  \Symfony\Component\HttpFoundation\File\UploadedFile|array $file
     * @param  string|null $name
     * @return \Symfony\Component\HttpFoundation\File\File
     *
     * @throws \Hazzzard\Filepicker\Exception\FileValidationException
     * @throws \Symfony\Component\HttpFoundation\File\Exception\UploadException
     */
    public function upload($file, $name = null)
    {
        if (is_array($file)) {
            try {
                $file = $this->createUploadedFile($file);
            } catch (FileNotFoundException $e) {
                throw new UploadException($e->getErrorMessage());
            }
        }

        if (! $file->isValid()) {
            throw new UploadException($file->getErrorMessage());
        }

        $this->validateFile($file);

        $max = $this->config['max_number_of_files'];

        if ($max && $this->getTotal() >= $max) {
            throw new UploadException($this->getErrorMessage('max_number_of_files', array($max)));
        }

        if ($this->config['overwrite']) {
            $name = $name ?: $this->normalize($file->getClientOriginalName());
        } else {
            $name = $name ?: $this->getUniqueFilename($file->getClientOriginalName());
        }

        try {
            $file = $file->move($this->getPath(), $name);
        } catch (FileException $e) {
            throw new UploadException($e->getMessage());
        }

        if ($this->imageFile($file)) {
            $this->createImageVersions($file->getFilename());
        }

        return $file;
    }

    /**
     * Get uploaded files.
     *
     * @param  int      $offset
     * @param  int|null $limit
     * @param  int|null $sort
     * @return array
     */
    public function get($offset = 0, $limit = null, $sort = null)
    {
        if ($sort === static::SORT_FILENAME_ASC || $sort === static::SORT_FILENAME_DESC) {
            $files = $this->scanDir($sort == static::SORT_FILENAME_ASC ? 0 : 1);
            $sort = null;
        } else {
            $files = $this->scanDir();
        }

        if (! is_null($sort)) {
            $files = $this->sortFiles($files, $sort);
        }

        $files = array_slice($files, $offset, $limit ?: null);

        foreach ($files as $index => $file) {
            $files[$index] = $this->createFile($file);
        }

        return $files;
    }

    /**
     * Sort files.
     *
     * @param  array $files
     * @param  int   $sort
     * @return array
     */
    protected function sortFiles(array $files, $sort)
    {
        $that = $this;

        usort($files, function($a, $b) use ($that, $sort) {
            $a = $that->getPath($a);
            $b = $that->getPath($b);

            if ($sort === $that::SORT_FILEMTIME_ASC || $sort === $that::SORT_FILEMTIME_DESC) {
                $a = filemtime($a);
                $b = filemtime($b);
            }

            if ($sort === $that::SORT_FILESIZE_ASC || $sort === $that::SORT_FILESIZE_DESC) {
                $a = filesize($a);
                $b = filesize($b);
            }

            if ($a === $b) {
                return 0;
            }

            if ($sort === $that::SORT_FILEMTIME_ASC || $sort == $that::SORT_FILESIZE_ASC) {
                return $a > $b ? -1 : 1;
            }

            if ($sort === $that::SORT_FILEMTIME_DESC || $sort === $that::SORT_FILESIZE_DESC) {
                return $a < $b ? -1 : 1;
            }
        });

        return $files;
    }

    /**
     * Get the total number of uploaded files.
     *
     * @return int
     */
    public function getTotal()
    {
        return count($this->scanDir());
    }

    /**
     * Get image versions.
     *
     * @param  string $filename
     * @return array
     */
    public function getImageVersions($filename)
    {
        $files = array();

        foreach ($this->config['image_versions'] as $version => $options) {
            if (empty($version)) {
                continue;
            }

            try {
                $files[$version] = $this->createFile($filename, $version);
            } catch (FileNotFoundException $e) {

            }
        }

        return $files;
    }

    /**
     * Create file download response.
     *
     * @param  \Symfony\Component\HttpFoundation\File\File|string $file
     * @param  string $version
     * @param  bool   $prepare
     * @return \Symfony\Component\HttpFoundation\Response
     *
     * @throws \Symfony\Component\HttpFoundation\File\Exception\FileNotFoundException
     */
    public function download($file, $version = null, $prepare = true)
    {
        $file = $this->createFile($file, $version);

        $headers = array('X-Content-Type-Options' => 'nosniff');

        if ($this->inlineFile($file->getFilename())) {
            $disposition = 'inline';
        } else {
            $disposition = 'attachment';
        }

        $response = $this->createFileResponse($file, null, $headers, $disposition);

        return $prepare ? $response->prepare(Request::createFromGlobals())->send() : $response;
    }

    /**
     * Delete file.
     *
     * @param  string $filename
     * @return bool
     *
     * @throws \Symfony\Component\HttpFoundation\File\Exception\FileNotFoundException
     */
    public function delete($filename, $version = null)
    {
        $file = $this->createFile($filename, $version);

        $success = @unlink($file);

        if ($success && $this->imageFile($filename)) {
            $this->deleteImageVersions($filename);
        }

        return $success;
    }

    /**
     * Validate uploaded file.
     *
     * @param  \Symfony\Component\HttpFoundation\File\UploadedFile $file
     * @return bool
     *
     * @throws \Hazzzard\Filepicker\Exception\FileValidationException
     */
    public function validateFile(UploadedFile $file)
    {
        $maxSize = $this->config['max_file_size'];
        $minSize = $this->config['min_file_size'];

        if (! $this->acceptedFile($file->getClientOriginalName())) {
            throw new FileValidationException(
                $this->getErrorMessage('file_not_accepted'),
                FileValidationException::NOT_ACCEPTED
            );
        }

        if ($maxSize && $file->getClientSize() > $maxSize) {
            throw new FileValidationException(
                $this->getErrorMessage('max_file_size', array($maxSize / 1024)),
                FileValidationException::MAX_FILE_SIZE
            );
        }

        if ($minSize && $file->getClientSize() < $minSize) {
            throw new FileValidationException(
                $this->getErrorMessage('min_file_size'),
                FileValidationException::MIN_FILE_SIZE
            );
        }

        if (! $this->imageFile($file->getClientOriginalName())) {
            return true;
        }

        $maxWidth  = $this->config['max_width'];
        $maxHeight = $this->config['max_height'];
        $minWidth  = $this->config['min_width'];
        $minHeight = $this->config['min_height'];

        if (! ($maxWidth || $maxHeight || $minWidth || $minHeight)) {
            return true;
        }

        list($width, $height) = $this->getImageSize($file);

        if ($maxWidth && $width > $maxWidth) {
            throw new FileValidationException(
                $this->getErrorMessage('max_width', array($maxWidth)),
                FileValidationException::MAX_WIDTH
            );
        }

        if ($minWidth && $width < $minWidth) {
            throw new FileValidationException(
                $this->getErrorMessage('min_width', array($minWidth)),
                FileValidationException::MIN_WIDTH
            );
        }

        if ($maxHeight && $height > $maxHeight) {
            throw new FileValidationException(
                $this->getErrorMessage('max_height', array($maxHeight)),
                FileValidationException::MAX_HEIGHT
            );
        }

        if ($minHeight && $height < $minHeight) {
            throw new FileValidationException(
                $this->getErrorMessage('min_height', array($minHeight)),
                FileValidationException::MIN_HEIGHT
            );
        }

        return true;
    }

    /**
     * Create image versions for the given file.
     *
     * @param  string $filename
     * @return \Intervention\Image\Image|null $image
     * @return void
     */
    public function createImageVersions($filename, $image = null)
    {
        $destroy = is_null($image);

        $versions = $this->config['image_versions'];

        if (is_null($image) && (count($versions) > 1 || empty($versions['']['raw']))) {
            $image = $this->imageManager->make($this->getPath($filename));
        }

        $orientate = false;

        foreach ($versions as $version => $options) {
            if (empty($options['raw'])) {
                if (! $orientate && ! empty($options['auto_orient'])) {
                    $orientate = true;
                    $image->orientate();
                }

                $this->createImageVersion($image, $filename, $version, $options);
            }
        }

        if ($destroy && ! is_null($image)) {
            $image->destroy();
        }
    }

    /**
     * Create image version.
     *
     * @return \Intervention\Image\Image $image
     * @param  string $filename
     * @param  string $version
     * @param  array  $options
     * @return bool
     */
    protected function createImageVersion($image, $filename, $version, array $options = array())
    {
        $image->backup();

        if (isset($options['before'])) {
            if (call_user_func($options['before'], $image, $filename, $version) === false) {
                return false;
            }
        }

        $width = isset($options['width']) ? $options['width'] : null;
        $height = isset($options['height']) ? $options['height'] : null;
        $maxWidth = isset($options['max_width']) ? $options['max_width'] : null;
        $maxHeight = isset($options['max_height']) ? $options['max_height'] : null;
        $quality = isset($options['quality']) ? $options['quality'] : null;

        if ($width || $height) {
            if (! $width) {
                $width = $image->width() / ($image->height() / $height);
            } elseif (! $height) {
                $height = $image->height() / ($image->width() / $width);
            }

            if (($image->width() / $image->height()) >= ($width / $height)) {
                $newWidth = $image->width() / ($image->height() / $height);
                $newHeight = $height;
            } else {
                $newWidth = $width;
                $newHeight = $image->height() / ($image->width() / $width);
            }

            $image->resize(intval($newWidth), intval($newHeight));
            $image->crop(intval($width), intval($height));
        } elseif ($maxWidth || $maxHeight) {
            if (! $maxWidth) {
                $maxWidth = $image->width();
            } elseif (! $maxHeight) {
                $maxHeight = $image->height();
            }

            $scale = min($maxWidth / $image->width(), $maxHeight / $image->height());

            $newWidth = $image->width() * $scale;
            $newHeight = $image->height() * $scale;

            if ($scale < 1) {
                $image->resize(intval($newWidth), intval($newHeight));
            }
        }

        $newFilepath = $this->getImageVersionNewPath($filename, $version);

        $image->save($newFilepath, $quality);

        if (isset($options['after'])) {
            call_user_func($options['after'], $image, $filename, $version);
        }

        $image->reset();

        return true;
    }

    /**
     * Get path for creating a new image version.
     *
     * @param  string $filename
     * @param  string $version
     * @return string
     */
    protected function getImageVersionNewPath($filename, $version)
    {
        $versionDir = $this->getPath(null, $version);

        if (! is_dir($versionDir)) {
            @mkdir($versionDir, $this->config['mkdir_mode'], true);
        }

        return $this->getPath($filename, $version);
    }

    /**
     * Delete image versions.
     *
     * @param  string $filename
     * @return array
     */
    public function deleteImageVersions($filename)
    {
        foreach ($this->config['image_versions'] as $version => $options) {
            if (! empty($version)) {
                @unlink($this->getPath($filename, $version));
            }
        }
    }

    /**
     * Create a file instance.
     *
     * @param  string $filename
     * @return \Symfony\Component\HttpFoundation\File\File
     *
     * @throws \Symfony\Component\HttpFoundation\File\Exception\FileNotFoundException
     */
    public function createFile($filename, $version = null)
    {
        return new File($this->getPath($filename, $version));
    }

    /**
     * Create uploaded file instance.
     *
     * @param  array $file
     * @return \Symfony\Component\HttpFoundation\File\UploadedFile
     *
     * @throws \Symfony\Component\HttpFoundation\File\Exception\FileNotFoundException
     */
    public function createUploadedFile(array $file)
    {
        return new UploadedFile(
            $file['tmp_name'], $file['name'], $file['type'], $file['size'], $file['error']
        );
    }

    /**
     * Get file name.
     *
     * @param  string $filename
     * @param  string $version
     * @return string
     */
    public function getFilename($filename, $version = null)
    {
        $versionDir = $this->config["image_versions.$version.upload_dir"];

        // If the upload_dir is the same as the version upload_dir,
        // add "-<version>" between filename and extension.
        if ($version && $versionDir && $versionDir === $this->getPath()) {
            $ext = pathinfo($filename, PATHINFO_EXTENSION);

            return substr($filename, 0, strlen($filename) - strlen($ext) - 1)."-$version.$ext";
        }

        return $filename;
    }

    /**
     *  Get unique file name.
     *
     *  @param  string $name
     *  @return string
     */
    public function getUniqueFilename($name)
    {
        $name = empty($name) ? mt_rand() : $this->normalize($name);

        while (file_exists($this->getPath($name))) {
            $name = preg_replace_callback(
                '/(?:(?:([\d]+))?(\.[^.]+))?$/',
                function ($matches) {
                    $end  = isset($matches[1]) ? (int) $matches[1] + 1 : 1;
                    $end .= isset($matches[2]) ? $matches[2] : '';
                    return $end;
                },
                $name,
                1
            );
        }

        return $name;
    }

    /**
     * Determine if the given file is accepted.
     *
     * @param  string $file
     * @return bool
     */
    public function acceptedFile($file)
    {
        if ($types = $this->config['accept_file_types']) {
            return preg_match('/\.('.$types.')$/i', $file) === 1;
        }

        if ($types = $this->config['accept_file_types_regex']) {
            return preg_match($types, $file) === 1;
        }

        if ($types = $this->config['reject_file_types']) {
            return ! (preg_match('/\.('.$types.')$/i', $file) === 1);
        }

        return true;
    }

    /**
     * Determine if the given file is an image.
     *
     * @param  string $file
     * @return bool
     */
    public function imageFile($file)
    {
        return preg_match('/\.('.$this->config['image_file_types'].')$/i', $file) === 1;
    }

    /**
     * Determine if the given file is an inline file.
     *
     * @param  string $file
     * @return bool
     */
    public function inlineFile($file)
    {
        return preg_match('/\.('.$this->config['inline_file_types'].')$/i', $file) === 1;
    }

    /**
     * Get the files inside upload directory.
     *
     * @param  int $sortingOrder
     * @return array
     */
    protected function scanDir($sortingOrder = 0)
    {
        $files = array();

        if (is_dir($directory = $this->getPath())) {
            foreach (scandir($directory, $sortingOrder) as $file) {
                if (is_file($this->getPath($file))) {
                    $files[] = $file;
                }
            }
        }

        return $files;
    }

    /**
     *  Get upload directory path.
     *
     *  @param  string $filename
     *  @param  string $version
     *  @return string
     */
    public function getPath($filename = null, $version = null)
    {
        $dir = $this->config['upload_dir'];
        $versionPath = '';

        if ($version) {
            $versionDir = $this->config["image_versions.$version.upload_dir"];

            if ($versionDir) {
                $dir = $versionDir;
            } else {
                $versionPath = '/'.$version;
            }
        }

        if ($filename) {
            $filename = $this->getFilename($this->normalize($filename), $version);
        }

        return $dir.$versionPath.($filename ? '/'.$filename : '');
    }

    /**
     * Create a new file download response.
     *
     * @param  \SplFileInfo|string $file
     * @param  string $name
     * @param  array  $headers
     * @param  string $disposition
     * @return \Symfony\Component\HttpFoundation\BinaryFileResponse
     *
     * @throws \Symfony\Component\HttpFoundation\File\Exception\FileException
     */
    public function createFileResponse($file, $name = null, $headers = array(), $disposition = 'attachment')
    {
        $response = new BinaryFileResponse($file, 200, $headers, true, $disposition);

        return $name ? $response->setContentDisposition($disposition, $name) : $response;
    }

    /**
     * Normalize file name.
     *
     * @param  string $name
     * @return string
     */
    public function normalize($name)
    {
        return trim(basename(stripslashes($name)), ".\x00..\x20");
    }

    /**
     * Get error message by id/key.
     *
     * @param  string $id
     * @param  array  $params
     * @return string
     */
    public function getErrorMessage($id, array $params = array())
    {
        $message = $this->config->get("messages.$id", $id);
        $params = array_merge(array($message), $params);

        if (count($params) < 2) {
            $params[1] = null;
        }

        return call_user_func_array('sprintf', $params);
    }

    /**
     * Get image size.
     *
     * @param  \SplFileInfo $file
     * @return array
     */
    public function getImageSize($file)
    {
        if ($this->imageManager->config['driver'] === 'gd') {
            return getimagesize($file->getPathname());
        }

        $image = new \Imagick($file->getPathname());

        return array($image->getImageWidth(), $image->getImageHeight());
    }

    /**
     * Get config instance / get/set config item.
     *
     * @param  mixed $key
     * @param  mixed $default
     * @return mixed
     */
    public function config($key = null, $default = null)
    {
        if (is_null($key)) {
            return $this->config;
        }

        if (is_array($key)) {
            return $this->config->set($key);
        }

        return $this->config->get($key, $default);
    }

    /**
     * Get the Intervention Image Manager.
     *
     * @return \Intervention\Image\ImageManager|null
     */
    public function getImageManager()
    {
        return $this->imageManager;
    }

    /**
     * Set default configuration items.
     *
     * @return void
     */
    protected function defaultConfig()
    {
        $defaults = array(
            'debug' => false,

            'upload_dir' => null,
            'upload_url' => 'files',
            'script_url' => 'http'.(isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 's' : '').
                            '://'.$_SERVER['HTTP_HOST'].$_SERVER['SCRIPT_NAME'],

            'min_file_size' => 1,
            'max_file_size' => null,

            // 'overwrite' => false,
            // 'php_download' => flase,
            // 'max_number_of_files' => null,

            // 'accept_file_types' => '',
            // 'accept_file_types_regex' => '',
            'reject_file_types' => 'php|phtml|php3|php5|phps|cgi',
            'image_file_types' => 'gif|jpg|jpeg|png',
            'inline_file_types' => 'gif|jpg|jpeg|png|pdf',

            'min_width' => 1,
            'min_height' => 1,
            'max_width' => null,
            'max_height' => null,

            'image_versions' => array(
                '' => array(
                    // 'raw' => false,
                    'auto_orient' => true,
                )
            ),

            'mkdir_mode' => 0777,

            'sort' => static::SORT_FILEMTIME_ASC,

            'messages' => array(
                'max_width' => 'Image exceeds maximum width of %d pixels.',
                'min_width' => 'Image requires a minimum width of %d pixels.',
                'max_height' => 'Image exceeds maximum height of %d pixels.',
                'min_height' => 'Image requires a minimum height of %d pixels.',
                'max_file_size' => 'The file size is too big (limit is %d KB).',
                'min_file_size' => 'The file size is too small.',
                'max_number_of_files' => 'Maximum number of %d files exceeded.',
                'file_not_accepted' => 'The file type is not accepted.',
                'abort' => 'The operation was aborted.',
                'error' => 'Oops! Something went wrong.',
                'not_found' => 'File not found.',
            )
        );

        foreach ($defaults as $key => $value) {
            if (! $this->config->has($key)) {
                $this->config[$key] = $value;
            }
        }
    }
}
