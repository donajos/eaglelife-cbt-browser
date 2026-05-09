<?php

header('Content-Type: application/json');

$status = [
    "examActive"    => true,       // true if exam is running
    "lockClient"    => false,       // true if client should be locked
    "shutdown"    => false       // true if client should shutdown
];

echo json_encode($status);