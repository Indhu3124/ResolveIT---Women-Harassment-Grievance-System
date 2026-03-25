package com.resolveit.backend.repository;

import com.resolveit.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * UserRepository
 *
 * Extends JpaRepository which provides built-in CRUD operations:
 *   - save(user)         → INSERT or UPDATE
 *   - findById(id)       → SELECT by primary key
 *   - findAll()          → SELECT all users
 *   - delete(user)       → DELETE
 *   - count()            → COUNT(*)
 *
 * We also declare custom query methods below.
 * Spring Data JPA automatically generates their SQL based on method names.
 *
 * @Repository — marks this as a Spring-managed repository bean
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Find a user by their email address.
     * Used during login to find the account being accessed.
     *
     * SQL: SELECT * FROM users WHERE email = ?
     */
    Optional<User> findByEmail(String email);

    /**
     * Check if a user with the given email already exists.
     * Used during registration to prevent duplicate accounts.
     *
     * SQL: SELECT COUNT(*) > 0 FROM users WHERE email = ?
     */
    boolean existsByEmail(String email);

    /**
     * Find all users with a specific role.
     * Used by Admin to list all committee members.
     *
     * SQL: SELECT * FROM users WHERE role = ?
     */
    List<User> findByRole(User.Role role);
}
