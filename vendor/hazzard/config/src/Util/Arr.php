<?php
namespace Hazzard\Config\Util;

use Closure;

class Arr
{
	/**
	 * Get an item from an array using "dot" notation.
	 *
	 * @param  array  $array
	 * @param  string $key
	 * @param  mixed  $default
	 * @return mixed
	 */
	public static function get($array, $key, $default = null)
	{
		if (is_null($key)) return $array;

		if (isset($array[$key])) return $array[$key];

		foreach (explode('.', $key) as $segment) {
			if ( ! is_array($array) || ! array_key_exists($segment, $array)) {
				return static::value($default);
			}

			$array = $array[$segment];
		}

		return $array;
	}

	/**
	 * Check if an item exists in an array using "dot" notation.
	 *
	 * @param  array  $array
	 * @param  string $key
	 * @return bool
	 */
	public static function has($array, $key)
	{
		if (empty($array) || is_null($key)) return false;

		if (array_key_exists($key, $array)) return true;

		foreach (explode('.', $key) as $segment) {
			if ( ! is_array($array) || ! array_key_exists($segment, $array)) {
				return false;
			}

			$array = $array[$segment];
		}

		return true;
	}

	/**
	 * Set an array item to a given value using "dot" notation.
	 *
	 * If no key is given to the method, the entire array will be replaced.
	 *
	 * @param  array  $array
	 * @param  string $key
	 * @param  mixed  $value
	 * @return array
	 */
	public static function set(&$array, $key, $value)
	{
		if (is_null($key)) return $array = $value;

		$keys = explode('.', $key);

		while (count($keys) > 1) {
			$key = array_shift($keys);

			// If the key doesn't exist at this depth, we will just create an empty array
			// to hold the next value, allowing us to create the arrays to hold final
			// values at the correct depth. Then we'll keep digging into the array.
			if ( ! isset($array[$key]) || ! is_array($array[$key])) {
				$array[$key] = array();
			}

			$array =& $array[$key];
		}

		$array[array_shift($keys)] = $value;

		return $array;
	}

	/**
	 * Return the default value of the given value.
	 *
	 * @param  mixed $value
	 * @return mixed
	 */
	public static function value($value)
	{
		return $value instanceof Closure ? $value() : $value;
	}
}
