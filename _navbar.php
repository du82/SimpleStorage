<?php

function tab_active($page)
{
    echo substr($_SERVER['SCRIPT_NAME'], - strlen($page)) === $page ? ' class="active"' : '';
}

function demo_nav()
{
    ?>
    <ul class="nav nav-tabs demo-nav-tabs">
        <li<?php tab_active('index.php'); ?>><a href="index.php">Default</a></li>
        <li<?php tab_active('plus.php'); ?>><a href="advanced.php">Advanced</a></li>
    </ul>
    <?php
}
?>

<div class="navbar navbar-default">
    <div class="container">
        <div class="col-md-9 col-md-offset-2">
            <div class="navbar-header">
                <button type="button" class="navbar-toggle" data-toggle="collapse" data-target=".navbar-collapse">
                    <span class="sr-only">Toggle navigation</span>
                    <span class="icon-bar"></span>
                    <span class="icon-bar"></span>
                    <span class="icon-bar"></span>
                </button>
                <a href="index.php" class="navbar-brand">Simple Storage</a>
            </div>
            <div class="navbar-collapse collapse">
                <ul class="nav navbar-nav navbar-right">
                    <li><a href="https://octarus.dev/storage" target="_blank">Docs</a></li>
                </ul>
            </div>
        </div>
    </div>
</div>
