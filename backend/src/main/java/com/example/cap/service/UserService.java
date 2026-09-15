package com.example.cap.service;

import com.example.cap.entity.User;
import com.example.cap.entity.UserRole;
import com.example.cap.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TotpService totpService;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, TotpService totpService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.totpService = totpService;
    }

    /**
     * 자체 회원가입 신청 워크플로우 (초기 상태: PENDING)
     */
    @Transactional
    public User registerUser(String username, String password, String name, String email, String corpId, String deptName, UserRole role) {
        if (userRepository.findByUsername(username).isPresent()) {
            throw new IllegalArgumentException("이미 가입 신청되었거나 등록된 사번입니다.");
        }

        User newUser = User.builder()
                .username(username)
                .password(passwordEncoder.encode(password))
                .name(name)
                .email(email)
                .corpId(corpId)
                .deptName(deptName)
                .role(role)
                .approvalStatus("PENDING") // 감사팀 승인 대기 상태
                .isOtpRegistered(false)
                .enabled(true)
                .build();

        return userRepository.save(newUser);
    }

    /**
     * ID 중복 여부 확인
     */
    @Transactional(readOnly = true)
    public boolean existsByUsername(String username) {
        if (username == null || username.trim().isEmpty()) return false;
        return userRepository.findByUsername(username.trim()).isPresent();
    }

    /**
     * 시스템 관리자가 직접 사용자를 등록 (초기 상태: APPROVED)
     */
    @Transactional
    public User createUserByAdmin(String username, String password, String name, String email, String corpId, String deptName, UserRole role) {
        if (userRepository.findByUsername(username).isPresent()) {
            throw new IllegalArgumentException("이미 등록된 ID입니다.");
        }

        User newUser = User.builder()
                .username(username)
                .password(passwordEncoder.encode(password))
                .name(name)
                .email(email)
                .corpId(corpId != null ? corpId : "CORP_A")
                .deptName(deptName)
                .role(role != null ? role : UserRole.MEMBER)
                .approvalStatus("APPROVED") // 관리자 직접 등록이므로 즉시 승인
                .isOtpRegistered(false)
                .enabled(true)
                .build();

        return userRepository.save(newUser);
    }

    /**
     * 감사팀(관리자) 승인 워크플로우
     */
    @Transactional
    public User approveUser(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        
        user.setApprovalStatus("APPROVED");
        return userRepository.save(user);
    }

    /**
     * MFA OTP용 Secret Key 생성 및 할당
     */
    @Transactional
    public String setupMfa(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        // Secret Key가 없는 경우 신규 생성
        if (user.getOtpSecret() == null) {
            String secretKey = totpService.generateSecretKey();
            user.setOtpSecret(secretKey);
            userRepository.save(user);
        }

        return user.getOtpSecret();
    }

    /**
     * MFA OTP 등록 완료 처리
     */
    @Transactional
    public void enableMfa(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        user.setIsOtpRegistered(true);
        userRepository.save(user);
    }

    /**
     * 그룹웨어 연동 사용자 동기화 (Upsert)
     */
    @Transactional
    public User syncGroupwareUser(com.example.cap.dto.GroupwareUserDto gwDto, String rawPassword) {
        User user = userRepository.findByUsername(gwDto.getMemberId()).orElse(null);

        if (user == null) {
            user = User.builder()
                    .username(gwDto.getMemberId())
                    .password(passwordEncoder.encode(rawPassword))
                    .name(gwDto.getMemberName())
                    .email(gwDto.getEmail())
                    .corpId(gwDto.getCorpName() != null ? gwDto.getCorpName() : "CORP_A") // 그룹웨어의 법인명 반영
                    .deptName(gwDto.getGroupName())
                    .role(UserRole.DEPT_MEMBER) // 기본 권한: 유관부서 담당자
                    .approvalStatus("APPROVED") // 그룹웨어 계정은 자동 승인
                    .isOtpRegistered(false)
                    .enabled(true)
                    .build();
        } else {
            // 정보 갱신
            user.setName(gwDto.getMemberName());
            user.setEmail(gwDto.getEmail());
            user.setCorpId(gwDto.getCorpName() != null ? gwDto.getCorpName() : user.getCorpId());
            user.setDeptName(gwDto.getGroupName());
            // 비밀번호 갱신 (로컬 로그인 지원을 위해 bcrypt 저장)
            user.setPassword(passwordEncoder.encode(rawPassword));
        }

        return userRepository.save(user);
    }

    /**
     * 모든 사용자 정보 조회 (관리자용)
     */
    @Transactional(readOnly = true)
    public java.util.List<User> getAllUsers() {
        return userRepository.findAll();
    }

    /**
     * 사용자 권한 업데이트 (관리자용)
     */
    @Transactional
    public User updateUserRole(String username, UserRole newRole) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        user.setRole(newRole);
        return userRepository.save(user);
    }

    /**
     * 사용자 활성화 상태 업데이트 (관리자용)
     */
    @Transactional
    public User updateUserStatus(String username, boolean enabled) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        user.setEnabled(enabled);
        return userRepository.save(user);
    }
}
