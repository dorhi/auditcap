package com.example.cap.exception;

public class ProjectFrozenException extends RuntimeException {
    public ProjectFrozenException(String message) {
        super(message);
    }
}
