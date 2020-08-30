<?php

/**
 * This file is part of Filepicker.
 *
 * (c) HazzardWeb <hazzardweb@gmail.com>
 *
 * For the full copyright and license information, please visit:
 * http://codecanyon.net/licenses/standard
 */

namespace Hazzard\Filepicker\Exception;

use Symfony\Component\HttpFoundation\File\Exception\UploadException;

class FileValidationException extends UploadException
{
    const NOT_ACCEPTED = 1;
    const MAX_FILE_SIZE = 2;
    const MIN_FILE_SIZE = 3;
    const MAX_WIDTH = 4;
    const MIN_WIDTH = 5;
    const MAX_HEIGHT = 6;
    const MIN_HEIGHT = 7;
}
