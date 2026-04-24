<?php
session_start();
header("Content-Type: application/json; charset=utf-8");

$conn = mysqli_connect(getenv("DB_HOST"), getenv("DB_USER"), getenv("DB_PASS"), getenv("DB_NAME"));
if (!$conn) { http_response_code(500); echo json_encode(["error"=>"DB"]); exit; }

$action = $_GET["action"] ?? "";

if ($action === "session") {
    echo json_encode(["authenticated"=>isset($_SESSION["user_name"]), "user_name"=>$_SESSION["user_name"] ?? null]);
    mysqli_close($conn); exit;
}

if ($action === "logout") {
    session_unset(); session_destroy();
    echo json_encode(["status"=>"OK"]);
    mysqli_close($conn); exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405); echo json_encode(["error"=>"Method Not Allowed"]);
    mysqli_close($conn); exit;
}

$data = json_decode(file_get_contents("php://input"), true);
if (!is_array($data)) {
    http_response_code(400); echo json_encode(["error"=>"Bad Request"]);
    mysqli_close($conn); exit;
}

if ($action === "signup") {
    $u = trim($data["user_name"] ?? "");
    $d = trim($data["display_name"] ?? "");
    $e = trim($data["email"] ?? "");
    $p = $data["password"] ?? "";

    if ($u==="" || $d==="" || $e==="" || $p==="") { http_response_code(400); echo json_encode(["error"=>"Missing fields"]); mysqli_close($conn); exit; }
    if (!filter_var($e, FILTER_VALIDATE_EMAIL)) { http_response_code(400); echo json_encode(["error"=>"Invalid email"]); mysqli_close($conn); exit; }

    $uEsc = mysqli_real_escape_string($conn, $u);
    $dEsc = mysqli_real_escape_string($conn, $d);
    $eEsc = mysqli_real_escape_string($conn, $e);

    $chk = mysqli_query($conn, "SELECT id FROM registered_users WHERE user_name='$uEsc' OR email='$eEsc' LIMIT 1");
    if ($chk && mysqli_num_rows($chk) > 0) { http_response_code(409); echo json_encode(["error"=>"User/email exists"]); mysqli_close($conn); exit; }

    $hash = mysqli_real_escape_string($conn, password_hash($p, PASSWORD_DEFAULT));
    $q = "INSERT INTO registered_users (user_name, display_name, password, email) VALUES ('$uEsc','$dEsc','$hash','$eEsc')";
    if (!mysqli_query($conn, $q)) { http_response_code(500); echo json_encode(["error"=>"Server Error"]); mysqli_close($conn); exit; }

    http_response_code(201); echo json_encode(["status"=>"Created"]);
    mysqli_close($conn); exit;
}

if ($action === "login") {
    $u = trim($data["user_name"] ?? "");
    $p = $data["password"] ?? "";
    if ($u==="" || $p==="") { http_response_code(400); echo json_encode(["error"=>"Missing credentials"]); mysqli_close($conn); exit; }

    $uEsc = mysqli_real_escape_string($conn, $u);
    $res = mysqli_query($conn, "SELECT id,user_name,password FROM registered_users WHERE user_name='$uEsc' LIMIT 1");
    if (!$res || mysqli_num_rows($res) === 0) { http_response_code(401); echo json_encode(["error"=>"Invalid credentials"]); mysqli_close($conn); exit; }

    $row = mysqli_fetch_assoc($res);
    if (!password_verify($p, $row["password"])) { http_response_code(401); echo json_encode(["error"=>"Invalid credentials"]); mysqli_close($conn); exit; }

    $_SESSION["user_name"] = $row["user_name"];
    mysqli_query($conn, "UPDATE registered_users SET last_login=NOW() WHERE id=".$row["id"]);

    echo json_encode(["status"=>"OK"]);
    mysqli_close($conn); exit;
}

http_response_code(400); echo json_encode(["error"=>"Invalid action"]);
mysqli_close($conn);
