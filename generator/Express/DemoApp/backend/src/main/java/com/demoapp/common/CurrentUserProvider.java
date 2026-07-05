package com.demoapp.common;

import com.demoapp.user.User;
import com.demoapp.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * Resolves the currently authenticated user's id for per-user data scoping
 * (multi-user foundation, ADR-005).
 *
 * Generated entity services use this so that every row is owned by — and only
 * visible to — the user who created it. It is part of the multi-user-ready
 * foundation that exists from day one; in a single-user project it simply goes
 * unused.
 */
@Component
public class CurrentUserProvider {

    private final UserRepository users;

    public CurrentUserProvider(UserRepository users) {
        this.users = users;
    }

    /** The authenticated user's id, or 401 if there is no authenticated user. */
    public Long requireCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No authenticated user");
        }
        User user = users.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unknown user"));
        return user.getId();
    }
}
