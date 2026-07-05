package com.demoapp.config;

import com.demoapp.user.User;
import com.demoapp.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Seeds the default login user once, on startup, if it does not already exist.
 *
 * The password is hashed here at runtime (with a per-install salt) — this is
 * application behaviour, not generator output, so it does not affect the
 * deterministic, byte-for-byte generation guarantee (ADR-003).
 */
@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final String adminUsername;
    private final String adminPassword;

    public DataSeeder(
            UserRepository users,
            PasswordEncoder encoder,
            @Value("${app.seed.admin-username}") String adminUsername,
            @Value("${app.seed.admin-password}") String adminPassword) {
        this.users = users;
        this.encoder = encoder;
        this.adminUsername = adminUsername;
        this.adminPassword = adminPassword;
    }

    @Override
    public void run(String... args) {
        if (users.findByUsername(adminUsername).isEmpty()) {
            User user = new User();
            user.setUsername(adminUsername);
            user.setPasswordHash(encoder.encode(adminPassword));
            user.setEnabled(true);
            users.save(user);
        }
    }
}
