<?php
header("Content-Type: application/json; charset=utf-8");
$configPath = __DIR__ . '/config.php';
if (file_exists($configPath)) { require_once $configPath; }
$dbHost = defined('DB_HOST') ? DB_HOST : getenv('DB_HOST');
$dbUser = defined('DB_USER') ? DB_USER : getenv('DB_USER');
$dbPass = defined('DB_PASS') ? DB_PASS : getenv('DB_PASS');
$dbName = defined('DB_NAME') ? DB_NAME : getenv('DB_NAME');
$conn = mysqli_connect($dbHost, $dbUser, $dbPass, $dbName);
if (!$conn) {
    http_response_code(500);
    echo json_encode(["error" => "Database connection failed: " . mysqli_connect_error()]);
}

$method = $_SERVER["REQUEST_METHOD"];

if ($method === "POST"){
        $raw = file_get_contents('php://input');
        if(!$raw){
            http_response_code(400);
            echo json_encode(["error" => "Bad Request."]);
            mysqli_close($conn);
            exit;
        }
        $data = json_decode($raw, true);
        $required = ["username", "region", "city", "country"];
        foreach($required as $field){
            if(!isset($data[$field]) || trim($data[$field])===""){
                http_response_code(400);
                echo json_encode(["error" => "Missing field: $field"]);
                mysqli_close($conn);
                exit;
            }
        }
        $username = trim($data["username"]);
        $region = trim($data["region"]);
        $address = $region;
        $city = trim($data["city"]);
        $country = trim($data["country"]);
        $ts = time();
        $query = "INSERT INTO requests (username, timestamp, address, region, city, country) VALUES ('$username', $ts, '$address', '$region', '$city', '$country')";
        if(mysqli_query($conn, $query)){
            http_response_code(201);
            echo json_encode(["status" => "Created"]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Server Error" . mysqli_error($conn)]);
        }
} elseif($method === "GET"){
    $username = isset($_GET["username"]) ? trim($_GET["username"]) : "";
    if ($username === "") {
        http_response_code(400);
        echo json_encode(["error" => "Bad Request"]);
        mysqli_close($conn);
        exit;
    }

    $query = "SELECT username, region, city, country, timestamp
              FROM requests
              WHERE username = '$username'
              ORDER BY timestamp DESC
              LIMIT 5";

    $result = mysqli_query($conn, $query);
    if (!$result) {
        http_response_code(500);
        echo json_encode(["error" => "Server Error"]);
        mysqli_close($conn);
        exit;
    }

    $rows = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $rows[] = $row;
    }

    http_response_code(200);
    echo json_encode($rows);
}
mysqli_close($conn);
exit;
?>

