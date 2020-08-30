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

use Exception;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\File\File;
use Hazzard\Filepicker\Exception\AbortException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\File\Exception\UploadException;
use Symfony\Component\HttpFoundation\File\Exception\FileNotFoundException;

abstract class BaseHandler
{
    /**
     * The request instance.
     *
     * @var \Symfony\Component\HttpFoundation\Request
     */
    protected $request;

    /**
     * The uploader instance.
     *
     * @var \Hazzard\Filepicker\BaseUploader
     */
    protected $uploader;

    /**
     * The registered events.
     *
     * @var array
     */
    protected $events = array();

    /**
     * Create a new handler instance.
     *
     * @param  \Hazzard\Filepicker\BaseUploader $uploader
     * @return void
     */
    public function __construct($uploader)
    {
        $this->uploader = $uploader;
    }

    /**
     * Handle an incoming HTTP request.
     *
     * @param  \Symfony\Component\HttpFoundation\Request|null $request
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function handle($request = null)
    {
        if (! $request instanceof Request) {
            $request = Request::createFromGlobals();
        }

        $this->request = $request;

        $this->fire('init');

        $method = $this->request->get('_method', $this->request->getMethod());

        try {
            return $this->{$method.'Action'}($this->request);
        } catch (AbortException $e) {
            $error = $e->getMessage() ?: $this->uploader->getErrorMessage('abort');
            return $this->json($error, 400);
        } catch (FileNotFoundException $e) {
            return $this->json($this->uploader->getErrorMessage('not_found'), 404);
        } catch (Exception $e) {
            if ($this->uploader->config('debug')) {
                throw $e;
            }

            return $this->json($this->uploader->getErrorMessage('error'), 500);
        }
    }

    /**
     * Handle GET request. Get the files.
     *
     * @param  \Symfony\Component\HttpFoundation\Request $request
     * @return \Symfony\Component\HttpFoundation\JsonResponse
     */
    public function getAction(Request $request)
    {
        if ($request->get($this->getSingularParamName())) {
            return $this->download($request);
        }

        $total = 0;
        $files = null;

        $this->fire('files.fetch', array(&$files, &$total));

        if (is_array($files)) {
            $total = $total ?: count($files);

            foreach ($files as &$file) {
                $file = $this->uploader->createFile($file);
            }
        } else {
            $limit = intval($request->get('limit'));
            $offset = intval($request->get('offset'));
            $sort = intval($request->get('sort', $this->uploader->config('sort')));

            $files = $this->uploader->get($offset, $limit, $sort);
            $total = $this->uploader->getTotal();
        }

        $this->fire('files.filter', array(&$files, &$total));

        foreach ($files as &$file) {
            $file = $this->fileToArray($file);
        }

        return $this->json(compact('files', 'total'));
    }

    /**
     * Handle POST request. Upload file(s).
     *
     * @param  \Symfony\Component\HttpFoundation\Request $request
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function postAction(Request $request)
    {
        $files = $request->files->get(
            $this->getParamName(),
            $request->files->get($this->getSingularParamName(), array())
        );

        if (! is_array($files)) {
            $files = array($files);
        }

        $response = array();

        foreach ($files as $file) {
            try {
                $file = $this->upload($file, $request);
            } catch (AbortException $e) {
                $file->errorMessage = $e->getMessage() ?: $this->uploader->getErrorMessage('abort');
            }

            $response[] = $this->fileToArray($file);
        }

        return $this->json($response, 201);
    }

    /**
     * Handle PATCH request. Crop image.
     *
     * @param  \Symfony\Component\HttpFoundation\Request $request
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function patchAction(Request $request)
    {
        $filename = $this->getFileNameParam($request);

        try {
            $file = $this->uploader->createFile($filename);
        } catch (FileNotFoundException $e) {
            return $this->json($this->uploader->getErrorMessage('not_found'), 404);
        }

        $image = $this->uploader->getImageManager()->make($file);

        $this->fire('crop.before', array($file, $image));

        $x = (int) $request->get('x');
        $y = (int) $request->get('y');
        $width = (int) $request->get('width');
        $height = (int) $request->get('height');
        $rotate = (int) $request->get('rotate');
        $scaleX = (int) $request->get('scaleX');
        $scaleY = (int) $request->get('scaleY');

        if (! empty($width) && ! empty($height)) {
            if (isset($file->save)) {
                // Delete old image versions.
                $this->uploader->deleteImageVersions($filename);

                $filename = $file->save .'.'. $file->getExtension();
                $file = $file->move($file->getPath(), $filename);
            }

            if ($scaleX == -1) {
                $image->flip('h');
            }

            if ($scaleY == -1) {
                $image->flip('v');
            }

            if ($rotate != 0) {
                $image->rotate(-$rotate);
            }

            $image->crop($width, $height, $x, $y);

            if ($this->uploader->config('keep_original_image')) {
                $this->uploader->config(array('image_versions..raw' => true));
            } else {
                $image->save($file, $this->uploader->config('image_versions..quality'));
            }

            $this->uploader->createImageVersions($filename, $image);
        }

        $this->fire('crop.after', array($file, $image));

        $image->destroy();

        return $this->json($file);
    }

    /**
     * Handle DELETE request. Delete file(s).
     *
     * @param  \Symfony\Component\HttpFoundation\Request $request
     * @return \Symfony\Component\HttpFoundation\JsonResponse
     */
    public function deleteAction(Request $request)
    {
        $response = array();

        $filenames = $this->getFilenamesParams($request);

        foreach ($filenames as $filename) {
            try {
                $file = $this->uploader->createFile($filename);
            } catch (FileNotFoundException $e) {
                $response[$filename] = false;
                continue;
            }

            if ($this->fire('file.delete', $file) !== false) {
                $response[$filename] = $this->uploader->delete($file);
            }
        }

        return $this->json($response);
    }

    /**
     * Upload file.
     *
     * @param  \Symfony\Component\HttpFoundation\File\UploadedFile $file
     * @return mixed
     */
    protected function upload(UploadedFile $file)
    {
        $this->fire('upload.before', $file);

        $filename = null;

        if (isset($file->save)) {
            $filename = $file->save .'.'. $file->getClientOriginalExtension();
        } elseif (isset($file->saveWithExtension)) {
            $filename = $file->saveWithExtension;
        }

        $max = $this->uploader->config('max_files');

        if ($max && $this->uploader->getTotal() >= $max) {
            $file->errorMessage = $this->uploader->getErrorMessage('max_files', compact('max'));
            $this->fire('upload.error', $file);

            return $file;
        }

        try {
            $file = $this->uploader->upload($file, $filename);
            $this->fire('upload.success', $file);
        } catch (UploadException $e) {
            $file->errorMessage = $e->getMessage();
            $this->fire('upload.error', $file);
        }

        return $file;
    }

    /**
     * Download file.
     *
     * @param  \Symfony\Component\HttpFoundation\Request $request
     * @return \Symfony\Component\HttpFoundation\Response
     */
    protected function download($request)
    {
        $version = $request->get('version');

        $filename = $this->getFilenameParam($request);

        try {
            $file = $this->uploader->createFile($filename, $version);
        } catch (FileNotFoundException $e) {
            return new Response($this->uploader->getErrorMessage('not_found'), 404);
        }

        $this->fire('file.download', array($file, $version));

        return $this->uploader->download($file, $version);
    }

    /**
     * Convert a file instance into array.
     *
     * @param  Symfony\Component\HttpFoundation\File\File $file
     * @return array
     */
    protected function fileToArray(File $file)
    {
        if ($file instanceof UploadedFile) {
            $data = array(
                'name' => $file->getClientOriginalName(),
                'size' => $file->getClientSize(),
                'type' => $file->getClientMimeType(),
                'error' => isset($file->errorMessage) ? $file->errorMessage : null,
                'extension' => $file->getClientOriginalExtension(),
            );
        } elseif (isset($file->errorMessage)) {
            $data = array(
                'name' => $file->getFilename(),
                'error' => $file->errorMessage,
                'extension' => $file->getExtension(),
            );
        } else {
            $data = array(
                'name' => $file->getFilename(),
                'url' => $this->getFileUrl($file->getFilename()),
                'size' => $file->getSize(),
                'time' => $file->getMTime(),
                'type' => $file->getMimeType(),
                'extension' => $file->getExtension(),
            );

            if ($this->uploader->imageFile($data['name'])) {
                list($width, $height) = $this->uploader->getImageSize($file);

                $data['width'] = $width;
                $data['height'] = $height;
                $data['versions'] = $this->getImageVersions($data['name']);
            }
        }

        if (isset($file->data)) {
            $data['data'] = $file->data;
        }

        return $data;
    }

    /**
     * @param  string $filename
     * @return array
     */
    protected function getImageVersions($filename)
    {
        $versions = array();

        foreach ($this->uploader->getImageVersions($filename) as $version => $file) {
            list($width, $height) = $this->uploader->getImageSize($file);

            $versions[$version] = array(
                'name' => $file->getFilename(),
                'url' => $this->getFileUrl($file->getFilename(), $version),
                'size' => $file->getSize(),
                'width' => $width,
                'height' => $height,
            );
        }

        return $versions;
    }

    /**
     * Get file url.
     *
     * @param  string $filename
     * @param  string $version
     * @return string
     */
    protected function getFileUrl($filename, $version = null)
    {
        $filename = rawurlencode($filename);
        $version  = rawurlencode($version);

        if ($this->uploader->config('php_download')) {
            $url  = $this->uploader->config('script_url');
            $url .= strpos($url, '?') === false ? '?' : '&';
            $url .= $this->getSingularParamName().'='.$filename;
            $url .= $version ? '&version='.$version : '';

            return $url;
        }

        if (! empty($version)) {
            if ($url = $this->uploader->config("image_versions.$version.upload_url")) {
                return $url.$this->uploader->getFilename($filename, $version);
            }

            return $this->uploader->config('upload_url').'/'.$version.'/'.$filename;
        }

        return $this->uploader->config('upload_url').'/'.$filename;
    }

    /**
     * Get file name param.
     *
     * @param  \Symfony\Component\HttpFoundation\Request $request
     * @return string|null
     */
    protected function getFilenameParam($request)
    {
        $params = $this->getFilenamesParams($request);

        return is_array($params) && count($params) ? $params[0] : null;
    }

    /**
     * Get file names params.
     *
     * @param  \Symfony\Component\HttpFoundation\Request $request
     * @return array
     */
    protected function getFilenamesParams($request)
    {
        $params = $request->get(
            $this->getParamName(),
            $request->get($this->getSingularParamName(), array())
        );

        $params = is_array($params) ? $params : array($params);

        return array_map(function ($value) {
            return urldecode($value);
        }, $params);
    }

    /**
     * Get singular param name.
     *
     * @return string
     */
    protected function getSingularParamName()
    {
        return substr($this->getParamName(), 0, -1);
    }

    /**
     * Get param name.
     *
     * @return string
     */
    protected function getParamName()
    {
        return $this->uploader->config('param_name', 'files');
    }

    /**
     * Register an event listener.
     *
     * @param  string|array    $event
     * @param  \Closure|string $listener
     * @return void
     */
    public function on($event, $listener)
    {
        foreach ((array) $event as $e) {
            $this->events[] = array($e, $listener);
        }
    }

    /**
     * Fire an event and call the listener.
     *
     * @param  string $event
     * @param  mixed  $payload
     * @return mixed
     */
    public function fire($event, $payload = null)
    {
        $response = null;

        if (! is_array($payload)) {
            $payload = array($payload);
        }

        foreach ($this->events as $value) {
            if ($value[0] === $event) {
                $response = call_user_func_array($value[1], $payload);
            }
        }

        return $response;
    }

    /**
     * Create a new json response.
     *
     * @param  mixed $data
     * @param  int   $status
     * @param  array $headers
     * @return \Symfony\Component\HttpFoundation\JsonResponse
     */
    public function json($data = null, $status = 200, array $headers = array())
    {
        if ($data instanceof File) {
            $data = $this->fileToArray($data);
        }

        return new JsonResponse($data, $status, $headers);
    }

    /**
     * Get the uploader instance.
     *
     * @return \Hazzard\Filepicker\BaseUploader
     */
    public function uploader()
    {
        return $this->uploader;
    }

    /**
     * Get the request instance.
     *
     * @return \Symfony\Component\HttpFoundation\Request
     */
    public function request()
    {
        return $this->request;
    }
}
