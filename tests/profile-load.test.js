const config = { webUrl: "http://llapiy.test" };
const defaultAvatar = "/default-avatar.png";

const apiResponse = {
    "data": {
        "user": {
            "name": "ADMIN",
            "last_name": "ADMIN",
            "email": "admin@admin.com",
            "foto_perfil": "profiles/admin.jpg",
            "roles": ["ADMINISTRADOR"],
            "permissions": ["users.view", "roles.view"]
        }
    }
};

function transform(response) {
    const profile = response.data.user || response.data;
    const photo = profile.foto_perfil ? config.webUrl + "/storage/" + profile.foto_perfil : defaultAvatar;
    return {
        name: profile.name + " " + profile.last_name,
        email: profile.email,
        photo: photo,
        roles: profile.roles.length,
        perms: profile.permissions.length
    };
}

console.log("--- TEST PERFIL ---");
try {
    const res = transform(apiResponse);
    console.log("Nombre: " + res.name);
    console.log("Email: " + res.email);
    console.log("Foto: " + res.photo);
    
    const ok = res.name === "ADMIN ADMIN" && res.photo.includes("/storage/") && res.perms === 2;
    console.log(ok ? "RESULTADO: OK" : "RESULTADO: FALLO");
} catch (e) {
    console.log("ERROR: " + e.message);
}
