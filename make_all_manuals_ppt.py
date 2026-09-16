import os
from ppt_helper import (
    create_base_presentation, add_title_slide, add_cards_slide, add_table_slide,
    C_NAVY_DARK, C_BLUE_PRIMARY, C_GREEN, C_AMBER, C_RED, C_PURPLE, C_WHITE,
    C_BLUE_LIGHT, C_BLUE_BORDER, C_CARD_BG, C_CARD_BORDER
)
from pptx.dml.color import RGBColor

OUT_DIR = os.path.join(os.path.dirname(__file__), "manuals_ppt")
os.makedirs(OUT_DIR, exist_ok=True)

# ==============================================================================
# 1. 법인 담당자 & 유관부서 매뉴얼 (MEMBER, DEPT_MEMBER)
# ==============================================================================
def build_member_manual():
    prs = create_base_presentation()
    total_slides = 7
    
    # 1. 표지
    add_title_slide(
        prs,
        "감사 지적사항(CAP) 조치계획 수립 및 증빙 관리",
        "법인 담당자(MEMBER) 및 유관부서(DEPT_MEMBER) 전용 실무 매뉴얼",
        "MEMBER / DEPT_MEMBER",
        "해외/국내 법인 담당자, 부서별 개선조치 작성자, 유관부서 협조자"
    )
    
    # 2. 역할 및 주요 업무
    cards_s2 = [
        {
            'header_title': '👤 법인 담당자 (MEMBER)',
            'header_color': C_BLUE_PRIMARY,
            'items': [
                ("1. 지적사항 확인:", "본인 법인 및 배정된 지적사항(CAP) 내용과 감사팀 요구 마감일 확인"),
                ("2. 조치계획 수립:", "구체적인 원인 분석 및 재발방지 개선조치계획 상세 작성"),
                ("3. 조치상태 설정:", "개선중(예상시기 입력) / 개선완료(완료일자 입력) 등 지정"),
                ("4. 증빙 첨부:", "개선 조치를 입증할 사진, 문서, 공문 등 파일 업로드"),
                ("5. 확인 상신:", "법인 대표담당자(LEAD_REP)에게 검토 및 승인 요청(CONFIRM)")
            ]
        },
        {
            'header_title': '🤝 유관부서 담당자 (DEPT_MEMBER)',
            'header_color': C_PURPLE,
            'items': [
                ("1. 타 부서 협조 확인:", "본인 부서가 유관부서 협조자로 지정된 지적사항 조회"),
                ("2. 협조 의견 작성:", "유관부서 협조 내용 입력 박스에 개선 방안 및 지원 의견 등록"),
                ("3. 실시간 누적 반영:", "등록된 의견은 기존 조치내역 하단에 박스 형태로 누적 표시"),
                ("4. 타임라인 기록:", "누가 언제 협조 의견을 작성했는지 이력에 영구 기록"),
                ("5. 진행 모니터링:", "타 법인/부서의 CAP 조치 진행 현황 열람")
            ]
        },
        {
            'header_title': '⚠️ 핵심 주의사항 (무결성 정책)',
            'header_color': C_RED,
            'items': [
                ("• 완료(Completion) 프로젝트:", "최종 승인 완료(Completion) 상태인 프로젝트는 수정/업로드 일체 불가"),
                ("• 감사실 검증 진행 중:", "감사실에 제출되어 검증 대기(PENDING_AUDIT) 중인 건은 조치 수정 불가"),
                ("• 마감일 준수:", "감사팀 예상 마감일 이전에 자체 목표 마감일을 수립하고 기한 내 완료"),
                ("• 증빙 파일 규격:", "건당 최대 50MB, 실행파일(.exe, .bat 등) 업로드 차단")
            ]
        }
    ]
    add_cards_slide(prs, "ROLE & SCOPE", "법인 담당자 및 유관부서의 역할과 책임", cards_s2, 2, total_slides)

    # 3. 지적사항 조치 4단계 워크플로우
    cards_s3 = [
        {
            'header_title': '1단계: 담당자 조치 작성',
            'header_color': C_BLUE_PRIMARY,
            'items': [
                ("주관자:", "법인 담당자 (MEMBER)"),
                ("동작:", "조치내용 작성, 증빙 업로드, 마감일자 입력"),
                ("상태값:", "작성중 (DRAFT) ➔ PENDING_LEAD"),
                ("액션:", "[임시저장] 또는 [확인 요청 (CONFIRM)]")
            ]
        },
        {
            'header_title': '2단계: 법인대표 검토',
            'header_color': C_AMBER,
            'items': [
                ("주관자:", "법인 대표담당자 (LEAD_REP)"),
                ("동작:", "조치내용 검토 후 감사실 제출 또는 반려"),
                ("상태값:", "PENDING_AUDIT 또는 REJECTED_LEAD"),
                ("반려 시:", "사유 확인 후 담당자가 재작성")
            ]
        },
        {
            'header_title': '3단계: 감사팀 검증',
            'header_color': C_GREEN,
            'items': [
                ("주관자:", "본사 감사실 (AUDITOR)"),
                ("동작:", "현장 및 증빙 검증 심사"),
                ("상태값:", "AUDIT_CONFIRMED 또는 REJECTED_AUDIT"),
                ("보완요청 시:", "감사팀 코멘트에 따라 보완작성")
            ]
        },
        {
            'header_title': '4단계: 조치 완료 종료',
            'header_color': C_NAVY_DARK,
            'items': [
                ("주관자:", "시스템 자동 잠금"),
                ("동작:", "해당 CAP 공식 종결"),
                ("상태값:", "감사담당자 확인완료 (조치종료)"),
                ("효과:", "프로젝트 최종 확정 대상에 포함")
            ]
        }
    ]
    add_cards_slide(prs, "WORKFLOW", "개별 지적사항(CAP) 4단계 결재 프로세스", cards_s3, 3, total_slides)

    # 4. 조치상태 코드 가이드
    headers_s4 = ["상태 코드", "화면 표기", "선택 기준", "필수 입력 항목", "예시"]
    rows_s4 = [
        ["IN_PROGRESS", "개선중", "현재 개선 대책을 수립하고 실행 중인 경우", "개선 예상 시기 (목표일자)", "설비 교체 발주 진행 중, 익월 납품 예정"],
        ["COMPLETED", "개선완료", "원인 분석 및 개선 대책 실행이 100% 완료된 경우", "개선완료일자 + 증빙자료 첨부", "규정 개정 및 전 직원 교육 완료 (결과보고서 첨부)"],
        ["ACTION_IMPOSSIBLE", "개선불가", "현지 법규/제도적 한계 등으로 개선이 불가능한 경우", "구체적인 사유 기재", "현지 토지사용권 규제로 인한 인허가 불가 사유"],
        ["CONTINUOUS_MANAGEMENT", "지속관리", "일회성 조치가 아닌 정기적 모니터링이 필요한 경우", "향후 관리 방안 및 점검 주기", "매월 원자재 재고 실사 및 오차율 지속 점검"],
        ["UNWRITTEN", "미작성", "초기 감사 지적사항 등록 상태 (작성 전)", "조치내용 작성 필요", "조치계획 미수립 상태"]
    ]
    add_table_slide(prs, "STATUS CODE", "조치 상태 코드 선택 기준 및 필수 요건", headers_s4, rows_s4, [2.0, 1.5, 3.2, 2.5, 2.533], 4, total_slides)

    # 5. [메뉴 2] 화면 조작 상세 가이드
    cards_s5 = [
        {
            'title': '1. 조회 및 지적사항 선택',
            'bg_color': C_CARD_BG,
            'items': [
                ("• 법인/프로젝트 선택:", "상단 조회조건에서 본인 소속 법인과 진행 중인 감사 프로젝트를 선택합니다."),
                ("• 그리드 리스트 확인:", "하단 테이블에서 본인에게 배정된 지적사항을 클릭하여 선택합니다."),
                ("• 스텝 바 확인:", "상단 4단계 스텝 바를 통해 현재 결재 진행 상태(작성중/검증대기 등)를 한눈에 파악합니다.")
            ]
        },
        {
            'title': '2. 에디터 및 증빙 파일 관리',
            'bg_color': C_CARD_BG,
            'items': [
                ("• Rich Text 에디터:", "글자 굵기, 색상, 글머리 기호, 표(Table) 삽입 기능을 활용하여 가독성 있게 작성합니다."),
                ("• 다중 파일 업로드:", "증빙 첨부 영역에서 [파일 선택]으로 여러 파일을 동시 선택(Ctrl+클릭) 후 [업로드]합니다."),
                ("• 파일 다운로드/삭제:", "등록된 파일명을 클릭해 다운로드하고, 잘못 올린 파일은 즉시 삭제 가능합니다.")
            ]
        },
        {
            'title': '3. 임시저장 및 상신(CONFIRM)',
            'bg_color': C_CARD_BG,
            'items': [
                ("• [임시저장]:", "작성 중인 내용을 중간 저장합니다. 결재 단계는 넘어가지 않으며 계속 수정 가능합니다."),
                ("• [확인 요청 (CONFIRM)]:", "작성이 완전히 완료되면 클릭하여 법인 대표담당자에게 상신합니다."),
                ("• 유관부서 협조:", "유관부서 담당자는 하단 협조 박스에 의견을 작성하고 [협조 내용 등록]을 클릭합니다.")
            ]
        }
    ]
    add_cards_slide(prs, "UI GUIDE", "[메뉴 2] 조치계획 & 필수 정보 입력 화면 상세 사용법", cards_s5, 5, total_slides)

    # 6. 타임라인 이력 및 반려 대처법
    cards_s6 = [
        {
            'header_title': '📜 누적 이력 타임라인 확인',
            'header_color': C_NAVY_DARK,
            'items': [
                ("• 처리 이력 추적:", "언제, 누가, 어떤 조치를 등록하고 결재했는지 시간순으로 모두 누적됩니다."),
                ("• 당시 조치내용 스냅샷:", "반려 또는 승인 당시 작성되었던 조치 원본 텍스트를 클릭하여 그대로 대조 열람할 수 있습니다."),
                ("• 투명한 변경 관리:", "감사실 피드백 및 유관부서 협조 의견이 누락 없이 기록됩니다.")
            ]
        },
        {
            'header_title': '↩️ 대표담당자 재수정 요청 (REJECTED_LEAD)',
            'header_color': C_AMBER,
            'items': [
                ("• 상태 확인:", "상태 뱃지가 주황색 '대표담당자 재수정 요청'으로 변경됩니다."),
                ("• 반려 사유 검토:", "타임라인 상단 또는 알림에 표시된 법인대표의 반려 코멘트를 정밀 확인합니다."),
                ("• 보완 및 재상신:", "지적된 미흡 사항을 보완하고 증빙을 보충한 뒤 다시 [확인 요청 (CONFIRM)]을 클릭합니다.")
            ]
        },
        {
            'header_title': '⚠️ 감사실 재작성 요청 (REJECTED_AUDIT)',
            'header_color': C_RED,
            'items': [
                ("• 상태 확인:", "상태 뱃지가 붉은색 '감사실 재작성 요청 (보완)'으로 변경됩니다."),
                ("• 감사관 의견 확인:", "감사팀이 요구한 보완 요구사항 및 지적 근거를 면밀히 분석합니다."),
                ("• 근본 개선 및 재제출:", "단순 형식 수정이 아닌 실질적 개선 대책을 기술한 후 다시 상신합니다.")
            ]
        }
    ]
    add_cards_slide(prs, "ITERATION & HISTORY", "이력 타임라인 열람 및 반려/보완 요청 대처 요령", cards_s6, 6, total_slides)

    # 7. FAQ 및 유의사항
    cards_s7 = [
        {
            'title': 'Q1. 조치내용 수정창이 비활성화(회색)되어 있어요.',
            'bg_color': C_BLUE_LIGHT,
            'border_color': C_BLUE_BORDER,
            'items': [
                ("원인 A:", "프로젝트가 최종 승인되어 '완료(Completion)' 상태인 경우 데이터가 잠깁니다."),
                ("원인 B:", "감사실에 제출되어 '감사실 검증대기' 또는 '검증완료' 상태인 경우 수정할 수 없습니다."),
                ("해결 방법:", "수정이 반드시 필요한 경우 법인 대표담당자 또는 감사팀에 반려 요청을 하시기 바랍니다.")
            ]
        },
        {
            'title': 'Q2. 증빙 파일 업로드 버튼이 차단되어 있습니다.',
            'bg_color': C_BLUE_LIGHT,
            'border_color': C_BLUE_BORDER,
            'items': [
                ("원인:", "프로젝트 완료(Completion) 상태이거나 감사실 검증 중/완료된 건은 임의의 증빙 변경이 차단됩니다."),
                ("규정 안내:", "증빙 파일은 조치 작성 중(DRAFT) 또는 반려 상태에서만 자유롭게 추가/삭제할 수 있습니다.")
            ]
        },
        {
            'title': 'Q3. 개선완료인데 개선완료일자를 안 넣으면 어떻게 되나요?',
            'bg_color': C_BLUE_LIGHT,
            'border_color': C_BLUE_BORDER,
            'items': [
                ("시스템 검증:", "'개선완료' 선택 시 개선완료일자 입력이 필수 검증으로 지정되어 있어 상신되지 않습니다."),
                ("조치 방법:", "실제 조치가 완료된 날짜를 Datepicker에서 선택하고 증빙을 첨부하여 상신하세요.")
            ]
        }
    ]
    add_cards_slide(prs, "FAQ", "자주 묻는 질문 (FAQ) 및 실무 유의사항", cards_s7, 7, total_slides)

    prs.save(os.path.join(OUT_DIR, "CAP_Manual_01_Member.pptx"))
    print("Created CAP_Manual_01_Member.pptx")


# ==============================================================================
# 2. 법인 대표담당자 매뉴얼 (LEAD_REP)
# ==============================================================================
def build_lead_rep_manual():
    prs = create_base_presentation()
    total_slides = 6
    
    # 1. 표지
    add_title_slide(
        prs,
        "법인 전체 조치내역 1차 검토 및 감사실 상신 승인",
        "법인 대표담당자(LEAD_REP) 전용 실무 매뉴얼",
        "LEAD_REP",
        "소속 법인 감사 총괄 대표담당자, 법인 내 감사 조치 관리자"
    )
    
    # 2. 역할 및 핵심 권한
    cards_s2 = [
        {
            'header_title': '1. 법인 CAP 총괄 검토',
            'header_color': C_BLUE_PRIMARY,
            'items': [
                ("• 소속 법인 전 건 모니터링:", "소속 법인의 모든 CAP 지적사항 및 담당자별 진행률 확인"),
                ("• 조치내용 품질 심사:", "담당자가 작성한 원인 분석, 조치계획, 증빙자료가 충분한지 1차 검증"),
                ("• 부서 간 조율:", "유관부서 협조가 필요한 항목의 의견 등록 여부 및 협조 상태 조율")
            ]
        },
        {
            'header_title': '2. 감사실 제출 승인 (CONFIRM)',
            'header_color': C_GREEN,
            'items': [
                ("• 승인 요건:", "조치 상태가 입력되어 있고, 조치내용 및 증빙이 감사실 검증에 부합하는 경우"),
                ("• 실행 버튼:", "[확인 완료 (감사팀 제출)] 버튼 클릭"),
                ("• 상태 변경:", "PENDING_LEAD ➔ PENDING_AUDIT (감사실 검증대기 전환)"),
                ("• 의견 첨부:", "필요 시 대표담당자 검토 의견을 함께 기재하여 상신")
            ]
        },
        {
            'header_title': '3. 미흡 건 재수정 요청 (반려)',
            'header_color': C_RED,
            'items': [
                ("• 반려 요건:", "내용이 부실하거나, 증빙이 누락되었거나, 기한 설정이 부적절한 경우"),
                ("• 실행 버튼:", "[재수정 요청 (반려)] 버튼 클릭"),
                ("• 필수 조건:", "구체적인 반려 사유 및 보완 가이드를 코멘트로 반드시 작성"),
                ("• 상태 변경:", "PENDING_LEAD ➔ REJECTED_LEAD (담당자 재작성 전환)")
            ]
        }
    ]
    add_cards_slide(prs, "ROLE & AUTHORITY", "법인 대표담당자의 역할과 권한 범위", cards_s2, 2, total_slides)

    # 3. 대표담당자 검토 기준 체크리스트
    headers_s3 = ["검토 항목", "세부 심사 기준", "미흡 시 조치", "적합 시 조치"]
    rows_s3 = [
        ["1. 원인 분석의 적정성", "발생 원인이 근본적으로 분석되었는지 (단순 실수 등으로 치부하지 않았는지)", "반려 사유에 '근본 원인 재분석 요구' 기재", "승인 진행"],
        ["2. 조치 상태 코드 일치", "개선중/개선완료 상태가 실제 이행 상황 및 일자와 일치하는지", "조치 상태 코드 및 날짜 수정 요구 반려", "승인 진행"],
        ["3. 증빙자료 신뢰성", "개선완료 건에 대해 입증 가능한 객관적 문서/사진이 첨부되었는지", "증빙 추가 첨부 요구 반려", "승인 진행"],
        ["4. 재발방지 대책 실효성", "동일한 지적사항이 재발하지 않도록 제도/프로세스 개선이 포함되었는지", "재발방지 대책 보완 요구 반려", "승인 진행"],
        ["5. 마감기한의 타당성", "감사팀 예상 마감일보다 늦지 않게 목표일이 설정되었는지", "마감일정 단축 조정 요구 반려", "승인 진행"]
    ]
    add_table_slide(prs, "CHECKLIST", "법인 대표담당자 조치 검토 5대 체크리스트", headers_s3, rows_s3, [2.2, 4.0, 3.0, 2.533], 3, total_slides)

    # 4. [메뉴 2] 화면에서의 결재 조작법
    cards_s4 = [
        {
            'title': '1. 대표담당자 확인 대기 건 조회',
            'bg_color': C_CARD_BG,
            'items': [
                ("• 메뉴 이동:", "좌측 [감사 조치계획 & 필수 정보 입력] 메뉴로 이동합니다."),
                ("• 상태 뱃지 확인:", "그리드에서 노란색 '대표담당자 확인대기 (PENDING_LEAD)' 뱃지가 표시된 건을 선택합니다."),
                ("• 종합 내역 검토:", "우측 상세 패널에서 담당자명, 부서, 조치내역, 첨부된 증빙파일을 면밀히 열람합니다.")
            ]
        },
        {
            'title': '2. 감사실 제출 (CONFIRM) 승인',
            'bg_color': C_CARD_BG,
            'items': [
                ("• 버튼 클릭:", "하단 결재 바에서 녹색 [확인 완료 (감사팀 제출)] 버튼을 클릭합니다."),
                ("• 의견 입력창:", "대표담당자 검토 의견을 입력할 수 있는 팝업창에 추가 피드백을 기재합니다."),
                ("• 감사실 상신:", "승인 즉시 본사 감사실의 검증 목록으로 이관되며 타임라인에 기록됩니다.")
            ]
        },
        {
            'title': '3. 재수정 요청 (반려: REJECT)',
            'bg_color': C_CARD_BG,
            'items': [
                ("• 버튼 클릭:", "하단 결재 바에서 주황색 [재수정 요청 (반려)] 버튼을 클릭합니다."),
                ("• 사유 필수 입력:", "담당자가 무엇을 어떻게 보완해야 하는지 구체적인 사유를 팝업창에 입력합니다."),
                ("• 담당자 피드백:", "확인 즉시 담당자에게 반려 처리되어 담당자가 내용을 보완할 수 있게 열립니다.")
            ]
        }
    ]
    add_cards_slide(prs, "UI OPERATION", "[메뉴 2] 화면에서의 승인 및 반려 상세 조작법", cards_s4, 4, total_slides)

    # 5. 법인 내 진척도 모니터링 ([메뉴 4])
    cards_s5 = [
        {
            'header_title': '📊 법인 이행률 종합 점검',
            'header_color': C_NAVY_DARK,
            'items': [
                ("• 메뉴 안내:", "[법인별 전체 감사 조치율 보고] 화면을 통해 법인 전체 통계를 실시간 확인합니다."),
                ("• 이행률 카드:", "소속 법인의 총 CAP 건수, 감사 검증완료 건수, 조치율(%)을 파악합니다."),
                ("• 미완료 지연 건 독려:", "마감일이 임박하거나 아직 미작성/작성중인 담당자를 파악하여 조속한 조치 작성을 독려합니다.")
            ]
        },
        {
            'header_title': '📑 엑셀 보고서 다운로드',
            'header_color': C_BLUE_PRIMARY,
            'items': [
                ("• 엑셀 다운로드 기능:", "상단 [엑셀 다운로드] 버튼을 클릭하여 소속 법인의 전체 지적사항 통계를 엑셀 파일로 저장합니다."),
                ("• 경영진 보고 활용:", "법인장 내부 주간/월간 회의 보고자료로 즉시 활용할 수 있습니다.")
            ]
        },
        {
            'header_title': '🏛️ 법인장 최종 확정 선행 준비',
            'header_color': C_GREEN,
            'items': [
                ("• 100% 검증 달성 확인:", "프로젝트 내 모든 지적사항이 감사실 검증(AUDIT_CONFIRMED)을 마쳐야 법인장 확정이 가능합니다."),
                ("• 법인장 사전 브리핑:", "전 건 조치 완료 후 법인장에게 최종 확정(CONFIRM) 절차를 안내합니다.")
            ]
        }
    ]
    add_cards_slide(prs, "MONITORING", "[메뉴 4] 법인 전체 감사 조치율 모니터링 및 진척 관리", cards_s5, 5, total_slides)

    # 6. FAQ 및 담당자 코칭 팁
    cards_s6 = [
        {
            'title': 'Q1. 담당자가 조치를 상신하지 않고 방치할 때는?',
            'bg_color': C_BLUE_LIGHT,
            'border_color': C_BLUE_BORDER,
            'items': [
                ("조치 팁:", "해당 지적사항의 담당자 부서 및 이름을 확인하고 유선 또는 메신저로 조속한 임시저장 및 CONFIRM을 독려합니다."),
                ("시스템 권한:", "대표담당자도 필요 시 담당자의 조치내역을 직접 함께 검토할 수 있습니다.")
            ]
        },
        {
            'title': 'Q2. 감사팀에서 보완 요청이 왔을 때는?',
            'bg_color': C_BLUE_LIGHT,
            'border_color': C_BLUE_BORDER,
            'items': [
                ("프로세스:", "감사팀이 보완 요청(REJECTED_AUDIT)한 건은 담당자가 내용을 수정하여 다시 대표담당자에게 상신하게 됩니다."),
                ("대표 검토:", "담당자가 감사팀 요구사항을 정확히 반영했는지 재검토 후 다시 감사팀으로 제출합니다.")
            ]
        },
        {
            'title': 'Q3. 완료(Completion) 상태인 프로젝트는 대표담당자가 열 수 있나요?',
            'bg_color': C_BLUE_LIGHT,
            'border_color': C_BLUE_BORDER,
            'items': [
                ("권한 정책:", "완료(Completion)된 프로젝트의 Open(완료해제) 권한은 법인장 또는 본사 감사팀에만 있습니다."),
                ("요청 방법:", "긴급한 재검토가 필요한 경우 감사팀에 완료해제(Open)를 공식 요청해야 합니다.")
            ]
        }
    ]
    add_cards_slide(prs, "FAQ & TIPS", "법인 대표담당자 실무 FAQ 및 코칭 가이드", cards_s6, 6, total_slides)

    prs.save(os.path.join(OUT_DIR, "CAP_Manual_02_LeadRep.pptx"))
    print("Created CAP_Manual_02_LeadRep.pptx")


# ==============================================================================
# 3. 법인장 매뉴얼 (CORP_HEAD)
# ==============================================================================
def build_corp_head_manual():
    prs = create_base_presentation()
    total_slides = 5
    
    # 1. 표지
    add_title_slide(
        prs,
        "감사 프로젝트 최종 검증 및 법인장 확정(CONFIRM)",
        "법인장(CORP_HEAD) 전용 경영진 실무 매뉴얼",
        "CORP_HEAD",
        "해외 및 국내 피감 법인장, 최고경영진"
    )
    
    # 2. 법인장의 역할 및 권한
    cards_s2 = [
        {
            'header_title': '1. 본인 법인 감사 격리 조회',
            'header_color': C_BLUE_PRIMARY,
            'items': [
                ("• 철저한 데이터 격리:", "로그인 시 타 법인 정보는 완전히 차단되며, 본인 법인의 감사 데이터만 표시됩니다."),
                ("• 사용자 명칭 표준화:", "시스템 전체에서 담당자 사번 대신 한글 이름과 공식 부서명으로 표시되어 직관적 파악이 가능합니다.")
            ]
        },
        {
            'header_title': '2. 프로젝트 최종 확정 (CONFIRM)',
            'header_color': C_GREEN,
            'items': [
                ("• 1단계 최종 승인권한:", "법인 내 모든 지적사항(CAP)이 조치 검증 완료되었을 때 법인장 최종 확정(CONFIRM)을 수행합니다."),
                ("• 경영진 책임 승인:", "법인 내 감사 지적사항의 이행 결과를 최종 확정하고 본사 감사실의 최종 종결을 요청합니다.")
            ]
        },
        {
            'header_title': '3. 프로젝트 Open (완료해제) 권한',
            'header_color': C_NAVY_DARK,
            'items': [
                ("• 완료해제 실행권한:", "법인장 권한으로 이미 완료(Completion)된 소속 법인의 프로젝트를 필요 시 다시 오픈(Open)할 수 있습니다."),
                ("• 긴급 수정 지원:", "감사실 승인 전후 긴급 추가 조치가 필요한 경우 활용됩니다.")
            ]
        }
    ]
    add_cards_slide(prs, "ROLE & SECURITY", "법인장의 역할 및 데이터 보안 정책", cards_s2, 2, total_slides)

    # 3. [메뉴 8] 프로젝트 최종 검증 및 확정 전용 화면 가이드
    cards_s3 = [
        {
            'title': '1단계: 소속 프로젝트 선택',
            'bg_color': C_CARD_BG,
            'items': [
                ("• 전용 메뉴 이동:", "좌측 메뉴에서 [프로젝트 최종 검증 및 확정]을 클릭합니다."),
                ("• 법인 전용 고정:", "상단 소속 법인 필터가 본인 법인으로 자동 고정되어 안전하게 조회됩니다."),
                ("• 프로젝트 선택:", "목록에서 검증할 감사 프로젝트를 클릭하여 종합 리포트를 호출합니다.")
            ]
        },
        {
            'title': '2단계: 지적사항 조치 종합 검토',
            'bg_color': C_CARD_BG,
            'items': [
                ("• 100% 완료 여부 확인:", "상단 '지적사항 검증: N / M건'에서 전체 CAP이 100% 완료되었는지 확인합니다."),
                ("• 상세 조치내용 열람:", "하단 그리드에서 각 CAP별 제목, 담당자 이름, 조치 상태, 최종 조치 결과, 증빙을 종합 검토합니다."),
                ("• 부서별 조치 확인:", "모든 유관부서와 담당자의 개선 결과가 충실한지 최종 판단합니다.")
            ]
        },
        {
            'title': '3단계: [최종 확정 (CONFIRM)] 실행',
            'bg_color': C_CARD_BG,
            'items': [
                ("• 버튼 활성화 조건:", "모든 CAP이 감사 검증 완료(AUDIT_CONFIRMED) 상태일 때만 확정 버튼이 활성화됩니다."),
                ("• 확정 코멘트 입력:", "확정 코멘트를 입력하고 [최종 확정 (CONFIRM 완료)] 버튼을 클릭합니다."),
                ("• 감사팀 이관:", "법인장 최종 확정이 완료되면 감사팀의 2단계 최종 완료(Completion) 승인으로 넘어갑니다.")
            ]
        }
    ]
    add_cards_slide(prs, "FINAL CONFIRM", "[메뉴 8] 프로젝트 최종 검증 및 확정 화면 실무 사용법", cards_s3, 3, total_slides)

    # 4. 종합 2단계 결재선 및 완료(Completion) 프로세스
    cards_s4 = [
        {
            'header_title': '🏛️ [1단계] 법인장 최종 확정 (CONFIRM)',
            'header_color': C_BLUE_PRIMARY,
            'items': [
                ("• 주관자:", "법인장 (CORP_HEAD)"),
                ("• 선행 필수 요건:", "소속 프로젝트 내 모든 CAP 감사실 검증완료 (100%)"),
                ("• 상태 변경:", "HEAD_CONFIRMED 기록 (확정자 이름, 일시, 의견)"),
                ("• 의미:", "피감 법인의 모든 개선조치가 공식적으로 완료되었음을 경영진 승인")
            ]
        },
        {
            'header_title': '🔒 [2단계] 감사팀 최종 승인 및 완료 (Completion)',
            'header_color': C_GREEN,
            'items': [
                ("• 주관자:", "본사 감사책임자 (AUDIT_LEADER) 및 감사담당자"),
                ("• 선행 필수 요건:", "법인장의 1단계 최종 확정 완료"),
                ("• 상태 변경:", "LEADER_APPROVED & projectState: FREEZE (완료)"),
                ("• 의미:", "본사 감사실의 최종 승인이 완료되어 프로젝트가 공식 완료(Completion) 종결됨")
            ]
        },
        {
            'header_title': '🛡️ 완료(Completion) 이후 시스템 보호 정책',
            'header_color': C_NAVY_DARK,
            'items': [
                ("• 데이터 무결성 락:", "완료(Completion) 처리 즉시 지적사항 내용 수정 및 증빙 파일 업로드/삭제가 원천 차단됩니다."),
                ("• 차기 연계 승계:", "개선불가/지속관리 건은 감사팀이 차기 프로젝트 개설 시 자동으로 다음 차수로 승계합니다.")
            ]
        }
    ]
    add_cards_slide(prs, "PROCESS", "법인장 확정 ➔ 감사팀 승인 및 완료(Completion) 연계 프로세스", cards_s4, 4, total_slides)

    # 5. 법인장 FAQ
    cards_s5 = [
        {
            'title': 'Q1. [최종 확정] 버튼이 회색으로 비활성화되어 클릭되지 않습니다.',
            'bg_color': C_BLUE_LIGHT,
            'border_color': C_BLUE_BORDER,
            'items': [
                ("원인:", "프로젝트 내에 아직 조치가 진행 중이거나 본사 감사실의 검증(AUDIT_CONFIRMED)을 받지 못한 지적사항이 1건이라도 남아있기 때문입니다."),
                ("조치:", "법인 대표담당자(LEAD_REP)에게 미완료 CAP의 신속한 조치 및 감사실 검증 마무리를 지시하십시오.")
            ]
        },
        {
            'title': 'Q2. 최종 확정 후 추가로 보완할 사항이 발견되었습니다.',
            'bg_color': C_BLUE_LIGHT,
            'border_color': C_BLUE_BORDER,
            'items': [
                ("승인 전인 경우:", "본사 감사팀에 연락하여 '보완 요청(AUDIT_REJECTED)' 처리를 요청하면 즉시 다시 수정할 수 있습니다."),
                ("완료(Completion)된 경우:", "[메뉴 4] 화면에서 법인장 권한으로 [완료해제(Open)]를 실행하면 프로젝트가 다시 오픈됩니다.")
            ]
        },
        {
            'title': 'Q3. 법인 전체 감사 지적사항의 진행률을 한눈에 보려면?',
            'bg_color': C_BLUE_LIGHT,
            'border_color': C_BLUE_BORDER,
            'items': [
                ("화면 안내:", "[법인별 전체 감사 조치율 보고] 화면을 통해 법인 내 모든 프로젝트의 진행률(%)과 지적사항 현황을 실시간 모니터링할 수 있습니다.")
            ]
        }
    ]
    add_cards_slide(prs, "FAQ", "법인장 실무 FAQ 및 운영 안내", cards_s5, 5, total_slides)

    prs.save(os.path.join(OUT_DIR, "CAP_Manual_03_CorpHead.pptx"))
    print("Created CAP_Manual_03_CorpHead.pptx")


# ==============================================================================
# 4. 감사팀 매뉴얼 (AUDITOR, AUDIT_LEADER)
# ==============================================================================
def build_audit_team_manual():
    prs = create_base_presentation()
    total_slides = 8
    
    # 1. 표지
    add_title_slide(
        prs,
        "감사 프로젝트 운영, CAP 검증 심사 및 최종 완료 관리",
        "감사담당자(AUDITOR) 및 감사책임자(AUDIT_LEADER) 전용 실무 매뉴얼",
        "AUDITOR / AUDIT_LEADER",
        "본사 감사실 전 임직원, 감사 검증 및 프로젝트 총괄 관리자"
    )
    
    # 2. 역할 및 권한 체계
    cards_s2 = [
        {
            'header_title': '🔍 감사 담당자 (AUDITOR)',
            'header_color': C_BLUE_PRIMARY,
            'items': [
                ("1. 프로젝트 신규 등록:", "연도_법인명 규칙 기반 프로젝트 개설 및 마감일(1차) 단일 지정"),
                ("2. CAP 지적사항 등록/수정:", "카테고리 분류, 다중 감사자 지정, 법인 조치담당자 지정"),
                ("3. 법인 조치내용 심사 검증:", "법인이 제출한 조치내역과 증빙을 검증하여 [감사 검증완료] 또는 [보완 요청]"),
                ("4. 프로젝트 조치 확인:", "법인장 최종 확정 건에 대해 2단계 확인 수행")
            ]
        },
        {
            'header_title': '⚖️ 감사 책임자 (AUDIT_LEADER)',
            'header_color': C_GREEN,
            'items': [
                ("1. 감사 프로젝트 총괄:", "전사 법인별 감사 진행 현황 및 조치율 모니터링 총괄"),
                ("2. 최종 승인 및 완료(Completion):", "법인장 최종 확정 프로젝트의 최종 승인 및 데이터 완료(Completion) 락 실행"),
                ("3. 즉시 최종 확정 권한:", "필요 시 담당자 확인과 동시에 즉시 최종 확정 및 완료(Completion) 실행 가능"),
                ("4. 완료 해제(Open) 제어:", "완료된 프로젝트의 안전한 재오픈(Open) 승인 및 제어")
            ]
        },
        {
            'header_title': '🔄 차기 연계 승계 관리',
            'header_color': C_PURPLE,
            'items': [
                ("1. 모태 프로젝트 지정:", "완료(Completion) 상태인 프로젝트를 기반으로 차기 차수 개설"),
                ("2. 개선완료 건 자동 제외:", "완료된 CAP은 자동 종결 처리"),
                ("3. 미완료 건 자동 승계:", "개선중/개선불가/지속관리 건은 신규 프로젝트로 자동 복제 승계하여 지속 관리")
            ]
        }
    ]
    add_cards_slide(prs, "ROLE & SCOPE", "감사실(담당자 및 책임자)의 역할과 핵심 권한", cards_s2, 2, total_slides)

    # 3. [메뉴 1] 프로젝트 등록 및 승계 관리
    cards_s3 = [
        {
            'title': '1. 신규 감사 프로젝트 등록',
            'bg_color': C_CARD_BG,
            'items': [
                ("• 명명 규칙:", "'연도_법인명' 필수 준수 (예: 2026_법인A)."),
                ("• 대상 법인 선택:", "피감 법인 코드 지정 (법인 격리 기준)."),
                ("• 마감일 단일화:", "1차 마감일 1개만 명확히 지정하여 혼선 방지."),
                ("• 담당자 다중 배정:", "법인 내 접근 허용 담당자 및 타 부서 유관 협조자를 체크박스로 다중 지정.")
            ]
        },
        {
            'title': '2. 완료(Completion) 프로젝트 기반 차기 프로젝트 개설',
            'bg_color': C_CARD_BG,
            'items': [
                ("• 모태 프로젝트 선택:", "완료(Completion) 처리된 이전 프로젝트를 선택합니다."),
                ("• 승계 분석 결과 확인:", "시스템이 총 CAP 건수, 제외 대상(개선완료), 승계 대상(미완료)을 자동 산출합니다."),
                ("• 차수 자동 증가:", "1차 ➔ 2차 명칭 자동 추천 (예: 2026_법인A_2차)."),
                ("• 차기 마감일 설정:", "새로운 차수의 마감기한을 설정하고 [생성 및 승계]를 실행합니다.")
            ]
        },
        {
            'title': '3. 승계된 CAP의 상태',
            'bg_color': C_CARD_BG,
            'items': [
                ("• 작성중(DRAFT) 초기화:", "승계된 CAP은 DRAFT 상태로 초기화되어 피감 법인이 2차 답변을 작성할 수 있습니다."),
                ("• 이전 원천 이력 연계:", "원천 CAP ID 및 이전 차수의 조치 이력이 연결되어 히스토리가 보존됩니다.")
            ]
        }
    ]
    add_cards_slide(prs, "PROJECT MANAGEMENT", "[메뉴 1] 프로젝트 신규 등록 및 완료 프로젝트 기반 승계", cards_s3, 3, total_slides)

    # 4. [메뉴 3] 감사 지적사항(CAP) 관리
    cards_s4 = [
        {
            'title': '1. 카테고리 관리',
            'bg_color': C_CARD_BG,
            'items': [
                ("• 분류 체계:", "재무, IT보안, 컴플라이언스, 환경/안전, 인사노무 등 대분류 관리."),
                ("• 동적 관리:", "[카테고리 관리] 모달을 통해 신규 카테고리를 추가/수정/삭제 가능.")
            ]
        },
        {
            'title': '2. 지적사항 등록 및 정보 지정',
            'bg_color': C_CARD_BG,
            'items': [
                ("• 제목 및 내용:", "감사 발견사항(Finding)의 사실관계 및 지적 근거 상세 기재."),
                ("• 담당 감사자 지정:", "복수의 감사자를 다중 지정하여 공동 감사 수행 지원."),
                ("• 피감법인 담당자 지정:", "조치를 담당할 법인 직원의 사번/이름/부서 매핑."),
                ("• 감사팀 예상 마감일:", "감사팀이 요구하는 조치 권고 기한 설정.")
            ]
        },
        {
            'title': '3. 지적사항 수정 및 삭제 규정',
            'bg_color': C_CARD_BG,
            'items': [
                ("• 상시 수정 권한:", "감사팀은 필요 시 법인 담당자 및 유관부서를 언제든지 변경/추가 가능."),
                ("• 완료 프로젝트 제한:", "단, 완료(Completion) 상태인 프로젝트의 지적사항은 삭제 및 수정이 원천 차단됩니다.")
            ]
        }
    ]
    add_cards_slide(prs, "FINDINGS (CAP)", "[메뉴 3] 감사 지적사항(CAP) 신규 등록 및 수정 관리", cards_s4, 4, total_slides)

    # 5. [메뉴 2] 법인 제출 조치 심사 및 피드백 (검증완료 / 보완요청)
    cards_s5 = [
        {
            'header_title': '📋 1. 감사실 검증 대기 건 심사',
            'header_color': C_NAVY_DARK,
            'items': [
                ("• 상태 필터:", "그리드에서 보라색 '감사실 검증대기 (PENDING_AUDIT)' 건을 조회합니다."),
                ("• 종합 심사:", "법인 담당자의 원인 분석, 조치 결과, 증빙자료, 유관부서 협조 내용을 정밀 검토합니다."),
                ("• 첨부 증빙 확인:", "등록된 증빙 파일을 다운로드하여 위변조 여부 및 실효성을 점검합니다.")
            ]
        },
        {
            'header_title': '✅ 2. 감사 검증완료 (CONFIRM)',
            'header_color': C_GREEN,
            'items': [
                ("• 심사 통과:", "조치가 충분하고 입증된 경우 [감사 검증완료 (CONFIRM)] 버튼을 클릭합니다."),
                ("• 코멘트 입력:", "감사 검증 의견을 기재하고 완료 처리합니다."),
                ("• 효과:", "해당 지적사항은 공식 '조치종료(AUDIT_CONFIRMED)' 상태로 전환되며 법인장 최종 확정 대상 건으로 승격됩니다.")
            ]
        },
        {
            'header_title': '↩️ 3. 감사실 재작성 요청 (보완: REJECT)',
            'header_color': C_RED,
            'items': [
                ("• 미흡 판정:", "조치가 미흡하거나 증빙이 부족한 경우 [재작성 요청 (보완)]을 클릭합니다."),
                ("• 보완 사유 필수:", "구체적인 반려 이유와 보완 방향을 코멘트에 반드시 기재합니다."),
                ("• 이터레이션:", "담당자에게 '감사실 재작성 요청 (REJECTED_AUDIT)' 상태로 이관되어 타임라인에 누적됩니다.")
            ]
        }
    ]
    add_cards_slide(prs, "AUDIT REVIEW", "[메뉴 2] 법인 조치내용 검증 심사 및 피드백 절차", cards_s5, 5, total_slides)

    # 6. [메뉴 8] 프로젝트 최종 검증 및 확정 / 완료(Completion) 실행
    cards_s6 = [
        {
            'title': '1. 법인장 확정 완료 건 확인',
            'bg_color': C_CARD_BG,
            'items': [
                ("• 메뉴 이동:", "[프로젝트 최종 검증 및 확정] 전용 화면으로 이동합니다."),
                ("• 필터 조회:", "결재 상태 필터에서 '확정 완료 건'을 선택하거나 전체 프로젝트를 조회합니다."),
                ("• 선행 조건 확인:", "법인장 1단계 확정(HEAD_CONFIRMED)이 완료되었는지 확인합니다.")
            ]
        },
        {
            'title': '2. 감사팀 최종 승인 및 완료(Completion) 실행',
            'bg_color': C_CARD_BG,
            'items': [
                ("• 패널 상태:", "우측 2단계 감사팀 패널에 녹색 '완료 가능' 뱃지가 활성화됩니다."),
                ("• [Completion 실행]:", "[감사팀 최종 승인 및 완료 (Completion 실행)] 버튼을 클릭합니다."),
                ("• 최종 승인 의견:", "감사팀 종합 감사 의견을 입력하고 확인을 누릅니다."),
                ("• 상태 전환:", "프로젝트가 '완료(Completion)' 상태로 안전하게 락(Lock) 처리됩니다.")
            ]
        },
        {
            'title': '3. 내용 미흡 시 보완 요청',
            'bg_color': C_CARD_BG,
            'items': [
                ("• 보완 요청 기능:", "법인장 확정 후라도 내용 재검토가 필요하면 [보완 요청]을 클릭할 수 있습니다."),
                ("• 사유 입력:", "보완 사유를 입력하면 프로젝트가 다시 오픈(OPEN) 상태로 전환되어 재조치가 가능해집니다.")
            ]
        }
    ]
    add_cards_slide(prs, "FINAL APPROVAL", "[메뉴 8] 프로젝트 최종 승인 및 완료(Completion) 처리", cards_s6, 6, total_slides)

    # 7. [메뉴 4] 전사 조치율 모니터링 & 감사책임자 즉시 완료 기능
    cards_s7 = [
        {
            'header_title': '📊 전사 모니터링 및 엑셀 출력',
            'header_color': C_NAVY_DARK,
            'items': [
                ("• 종합 현황판:", "전체 법인의 CAP 진행률, 감사 검증률, 완료(Completion) 프로젝트 현황 실시간 집계."),
                ("• 다차원 필터:", "법인별, 기간별, 프로젝트 상태(OPEN/FREEZE)별 정밀 검색 지원."),
                ("• 엑셀 보고서:", "전체 통계 및 지적사항 데이터를 원클릭 엑셀(.xlsx)로 다운로드.")
            ]
        },
        {
            'header_title': '⚡ 감사책임자 즉시 최종 완료 기능',
            'header_color': C_GREEN,
            'items': [
                ("• 담당자 확인:", "테이블 액션 열에서 [담당자 내용 확인] 모달을 통해 조치내용 즉시 점검."),
                ("• 원스톱 완료:", "확인 모달 내 [확인 및 즉시 최종 완료 (Completion)] 버튼을 통해 별도 화면 이동 없이 즉시 최종 승인 처리 지원.")
            ]
        },
        {
            'header_title': '🔓 프로젝트 완료 해제 (Open)',
            'header_color': C_AMBER,
            'items': [
                ("• 완료해제(Open) 실행:", "이미 완료된 프로젝트라도 추가 증빙 반영 등 불가피한 사유 발생 시 [완료해제(Open)] 버튼으로 재오픈 가능."),
                ("• 작업 후 재완료:", "보완 작업이 완료되면 다시 최종 승인 및 완료(Completion) 실행.")
            ]
        }
    ]
    add_cards_slide(prs, "MONITORING & QUICK ACTION", "[메뉴 4] 전사 조치율 보고 및 감사책임자 즉시 완료/오픈 제어", cards_s7, 7, total_slides)

    # 8. 감사팀 FAQ 및 운영 원칙
    cards_s8 = [
        {
            'title': 'Q1. 법인장 확정 전에 감사팀이 먼저 완료(Completion)할 수 있나요?',
            'bg_color': C_BLUE_LIGHT,
            'border_color': C_BLUE_BORDER,
            'items': [
                ("원칙:", "원칙적으로 법인장의 최종 확정(HEAD_CONFIRMED)이 선행되어야 합니다."),
                ("예외 권한:", "단, 감사책임자(AUDIT_LEADER) 및 시스템관리자(SYSTEM_ADMIN)는 긴급 종결이 필요한 경우 즉시 최종 승인 및 완료(Completion) 처리가 가능하도록 권한이 부여되어 있습니다.")
            ]
        },
        {
            'title': 'Q2. 승계 프로젝트 생성 시 완료된 CAP이 포함되나요?',
            'bg_color': C_BLUE_LIGHT,
            'border_color': C_BLUE_BORDER,
            'items': [
                ("자동 필터링:", "'개선완료(COMPLETED)'된 건은 완전히 종결되어 차기 프로젝트에서 자동 제외됩니다."),
                ("승계 대상:", "개선중, 개선불가, 지속관리 건만 선별 승계되어 차기 차수에서 관리됩니다.")
            ]
        },
        {
            'title': 'Q3. 감사자가 지적사항 내용을 직접 수정해도 되나요?',
            'bg_color': C_BLUE_LIGHT,
            'border_color': C_BLUE_BORDER,
            'items': [
                ("관리자 권한:", "감사팀은 프로젝트가 완료(Completion)되기 전이라면 언제든지 지적사항 제목, 내용, 담당자, 마감일을 직접 보완/수정할 수 있습니다.")
            ]
        }
    ]
    add_cards_slide(prs, "FAQ & PRINCIPLES", "감사팀 실무 FAQ 및 시스템 운영 원칙", cards_s8, 8, total_slides)

    prs.save(os.path.join(OUT_DIR, "CAP_Manual_04_AuditTeam.pptx"))
    print("Created CAP_Manual_04_AuditTeam.pptx")


# ==============================================================================
# 5. 시스템 관리자 매뉴얼 (SYSTEM_ADMIN)
# ==============================================================================
def build_admin_manual():
    prs = create_base_presentation()
    total_slides = 5
    
    # 1. 표지
    add_title_slide(
        prs,
        "사용자 계정, 화면 메뉴 및 역할별 권한 매트릭스 관리",
        "시스템 관리자(SYSTEM_ADMIN) 전용 운영 매뉴얼",
        "SYSTEM_ADMIN",
        "CAP 시스템 마스터 관리자, IT 운영자"
    )
    
    # 2. 시스템 관리 3대 핵심 메뉴
    cards_s2 = [
        {
            'header_title': '👤 사용자 계정 관리 (/users)',
            'header_color': C_BLUE_PRIMARY,
            'items': [
                ("• 신규 계정 승인:", "회원가입 요청 건의 가입 승인 및 반려 처리"),
                ("• 역할(Role) 배정:", "MEMBER, LEAD_REP, CORP_HEAD, AUDITOR, AUDIT_LEADER, ADMIN 지정"),
                ("• 법인/부서 매핑:", "사용자의 소속 법인 코드 및 부서명 입력/수정"),
                ("• 계정 잠금/활성화:", "퇴사자 또는 휴직자 계정 비활성화 및 비밀번호 재설정")
            ]
        },
        {
            'header_title': '🖥️ 화면 / 메뉴 관리 (/menus)',
            'header_color': C_GREEN,
            'items': [
                ("• 동적 메뉴 관리:", "사이드바 메뉴의 등록, 수정, 삭제를 UI에서 동적으로 제어"),
                ("• 메뉴 그룹 및 순서:", "감사 업무 관리 / 시스템 관리 그룹화 및 노출 순서(sort_order) 조정"),
                ("• 화면 형태 지정:", "내부 라우팅(INTERNAL) 및 외부 링크(EXTERNAL) 지원"),
                ("• 활성화 토글:", "메뉴별 즉시 활성화/비활성화 스위치 제공")
            ]
        },
        {
            'header_title': '🔐 역할별 권한 매트릭스 (/permissions)',
            'header_color': C_PURPLE,
            'items': [
                ("• 2차원 매트릭스 그리드:", "세로축(화면 메뉴) x 가로축(사용자 역할) 권한 매트릭스"),
                ("• 체크박스 권한 제어:", "체크박스 클릭 한 번으로 특정 역할의 화면 접근 권한 즉시 부여/회수"),
                ("• 실시간 반영:", "권한 변경 시 재시작 없이 사용자 화면에 즉시 적용")
            ]
        }
    ]
    add_cards_slide(prs, "ADMIN SCOPE", "시스템 관리자(SYSTEM_ADMIN) 3대 핵심 관리 영역", cards_s2, 2, total_slides)

    # 3. 사용자 계정 등록 및 승인 상세 절차
    cards_s3 = [
        {
            'title': '1. 회원가입 승인 절차',
            'bg_color': C_CARD_BG,
            'items': [
                ("• 가입 요청 확인:", "계정 관리 화면 상단에서 '승인 대기(PENDING)' 상태인 계정 목록을 조회합니다."),
                ("• 정보 검증:", "사번, 성명, 이메일, 소속 법인 정보가 적합한지 확인합니다."),
                ("• 역할 부여 및 승인:", "해당 임직원의 업무에 맞는 역할(Role)을 지정하고 [승인] 버튼을 클릭합니다.")
            ]
        },
        {
            'title': '2. 신규 계정 직접 생성 (관리자 등록)',
            'bg_color': C_CARD_BG,
            'items': [
                ("• 직접 등록 폼:", "아이디(사번), 성명, 이메일, 초기 비밀번호를 입력합니다."),
                ("• 법인 및 부서:", "소속 법인(필수)과 부서명을 입력합니다. (법인 코드는 DB 격리 기준이 됩니다)"),
                ("• 역할 선택:", "MEMBER / LEAD_REP / CORP_HEAD / AUDITOR 등 적합한 역할을 부여하고 저장합니다.")
            ]
        },
        {
            'title': '3. 비밀번호 초기화 및 보안 관리',
            'bg_color': C_CARD_BG,
            'items': [
                ("• 비밀번호 재설정:", "비밀번호를 분실한 사용자에 대해 안전한 임시 비밀번호를 재발급합니다."),
                ("• OTP 관리:", "OTP 등록 초기화가 필요한 경우 보안 설정을 리셋 지원합니다.")
            ]
        }
    ]
    add_cards_slide(prs, "USER MANAGEMENT", "사용자 계정 생성, 승인 및 보안 관리 상세 가이드", cards_s3, 3, total_slides)

    # 4. 권한 매트릭스 설정 가이드
    headers_s4 = ["메뉴명", "경로 (/URL)", "권장 허용 역할 (Role)", "비고"]
    rows_s4 = [
        ["프로젝트 신규 등록", "/projects", "SYSTEM_ADMIN, AUDIT_LEADER, AUDITOR", "감사팀 전용"],
        ["감사 조치계획 입력", "/action-plans", "전 역할 (MEMBER, DEPT_MEMBER, LEAD_REP, CORP_HEAD, 감사팀)", "공통 조치 화면"],
        ["감사 지적사항 관리", "/findings", "SYSTEM_ADMIN, AUDIT_LEADER, AUDITOR", "감사팀 전용"],
        ["법인장 프로젝트 최종 확정", "/head-final-approval", "SYSTEM_ADMIN, CORP_HEAD, AUDIT_LEADER, AUDITOR", "법인장 및 감사팀 전용"],
        ["법인별 조치율 보고", "/reports", "전 역할 (읽기 권한 등 차등)", "모니터링 대시보드"],
        ["사용자 계정 관리", "/users", "SYSTEM_ADMIN, AUDIT_LEADER", "관리자 전용"],
        ["화면 / 메뉴 관리", "/menus", "SYSTEM_ADMIN", "시스템 관리자 전용"],
        ["역할별 화면 접근 관리", "/permissions", "SYSTEM_ADMIN", "시스템 관리자 전용"]
    ]
    add_table_slide(prs, "ROLE PERMISSIONS", "시스템 화면별 권장 권한 매트릭스 기준", headers_s4, rows_s4, [2.5, 2.0, 4.5, 2.733], 4, total_slides)

    # 5. 서버 운영 및 비상 대응 FAQ
    cards_s5 = [
        {
            'title': 'Q1. 사용자가 메뉴가 안 보인다고 문의할 때',
            'bg_color': C_BLUE_LIGHT,
            'border_color': C_BLUE_BORDER,
            'items': [
                ("점검 1:", "[사용자 계정 관리]에서 해당 사용자의 '역할(Role)'이 정확히 부여되어 있는지 확인합니다."),
                ("점검 2:", "[역할별 화면 접근 관리] 매트릭스에서 해당 역할과 해당 메뉴의 체크박스가 체크되어 있는지 확인합니다.")
            ]
        },
        {
            'title': 'Q2. 법인 담당자가 타 법인 데이터가 안 보인다고 할 때',
            'bg_color': C_BLUE_LIGHT,
            'border_color': C_BLUE_BORDER,
            'items': [
                ("정상 동작 안내:", "본 시스템은 법인 데이터 격리 정책에 따라 본인 소속 법인의 데이터만 보이는 것이 정상 동작입니다."),
                ("다중 법인 조치 필요 시:", "해당 사용자를 지적사항의 '유관부서 협조자' 또는 프로젝트 접근 허용 인원으로 등록해 주어야 합니다.")
            ]
        },
        {
            'title': 'Q3. 비상 시 결재 강제 처리 권한',
            'bg_color': C_BLUE_LIGHT,
            'border_color': C_BLUE_BORDER,
            'items': [
                ("관리자 특권:", "시스템 관리자(`SYSTEM_ADMIN`)는 법인장 부재나 긴급 마감 시 모든 결재 단계(법인대표 승인, 법인장 확정, 감사팀 완료)를 강제 대행할 수 있는 마스터 권한을 보유합니다.")
            ]
        }
    ]
    add_cards_slide(prs, "ADMIN FAQ", "시스템 관리자 실무 점검 체크포인트 및 비상 대응", cards_s5, 5, total_slides)

    prs.save(os.path.join(OUT_DIR, "CAP_Manual_05_SystemAdmin.pptx"))
    print("Created CAP_Manual_05_SystemAdmin.pptx")


# ==============================================================================
# 6. 전사 종합 마스터 매뉴얼 (All Roles)
# ==============================================================================
def build_master_manual():
    prs = create_base_presentation()
    total_slides = 10
    
    # 1. 표지
    add_title_slide(
        prs,
        "글로벌 세아 감사 지적사항(CAP) 관리 시스템 종합 매뉴얼",
        "전사 임직원 및 전 역할(Role) 통합 프레젠테이션",
        "MASTER (전체 권한 통합본)",
        "법인담당자, 유관부서, 법인대표, 법인장, 감사실, 시스템관리자"
    )
    
    # 2. 시스템 개요 및 목적
    cards_s2 = [
        {
            'header_title': '🌐 실시간 글로벌 협업',
            'header_color': C_BLUE_PRIMARY,
            'items': [
                ("• 본사-법인 원스톱:", "본사 감사실과 전 세계 해외/국내 피감 법인 간의 감사 지적사항 및 개선조치를 단일 웹 플랫폼에서 실시간 공유"),
                ("• 업무 효율 극대화:", "수기 엑셀 취합 및 이메일 소통 방식을 탈피하여 클라우드 기반 실시간 조치 관리 체계 구축")
            ]
        },
        {
            'header_title': '⏱️ 2트랙 마감일 체계',
            'header_color': C_GREEN,
            'items': [
                ("• 감사팀 예상 마감일:", "감사실이 요구하는 조치 권고 기한을 명확히 제시"),
                ("• 법인 자체 조치 마감일:", "법인 담당자가 현실적이고 책임 있는 목표 마감일을 스스로 수립하여 일정 준수율 제고")
            ]
        },
        {
            'header_title': '🔒 데이터 무결성 보장',
            'header_color': C_NAVY_DARK,
            'items': [
                ("• 완료(Completion) 락:", "법인장 최종 확정 및 감사팀 승인 완료 시 데이터 수정 및 파일 업로드 원천 차단"),
                ("• 차기 연계 승계:", "완료 프로젝트의 미완료 건만 선별하여 차기 차수로 자동 복제 승계")
            ]
        }
    ]
    add_cards_slide(prs, "OVERVIEW", "시스템 도입 배경 및 3대 핵심 운영 원칙", cards_s2, 2, total_slides)

    # 3. 전사 역할 체계 (RBAC)
    headers_s3 = ["역할 코드", "역할 명칭", "주관 업무 및 권한 범위", "주요 접근 화면"]
    rows_s3 = [
        ["MEMBER", "법인 담당자", "지적사항 조치계획 작성, 증빙 첨부, 대표담당자 상신", "조치계획 입력 (/action-plans)"],
        ["DEPT_MEMBER", "유관부서", "타 부서 협조자로서 개선 협조 의견 추가 등록", "조치계획 입력 (/action-plans)"],
        ["LEAD_REP", "법인 대표담당자", "법인 조치내용 1차 검토, 감사실 제출(CONFIRM) 또는 반려", "조치계획 입력, 조치율 보고"],
        ["CORP_HEAD", "법인장", "소속 법인 프로젝트 종합 검증 및 [법인장 최종 확정]", "최종 검증 및 확정 (/head-final-approval)"],
        ["AUDITOR", "감사 담당자", "프로젝트/CAP 등록, 법인 조치 검증(CONFIRM) 및 보완요청", "프로젝트등록, CAP관리, 조치계획, 보고"],
        ["AUDIT_LEADER", "감사 책임자", "감사 총괄, 최종 승인 및 완료(Completion) 락, Open 제어", "전 화면 접근 및 완료/오픈 총괄"],
        ["SYSTEM_ADMIN", "시스템 관리자", "사용자 계정 승인, 화면/메뉴 관리, 권한 매트릭스 설정", "시스템 관리 전 화면 (/users, /menus, /permissions)"]
    ]
    add_table_slide(prs, "RBAC", "역할 기반 권한 관리(RBAC) 체계 매트릭스", headers_s3, rows_s3, [1.8, 1.8, 5.0, 3.133], 3, total_slides)

    # 4. CAP 4단계 결재선 워크플로우
    cards_s4 = [
        {
            'header_title': '1단계: 법인담당자',
            'header_color': C_BLUE_PRIMARY,
            'items': [
                ("• 액션:", "조치내역 작성, 상태코드 지정, 증빙 업로드"),
                ("• 버튼:", "[임시저장] / [확인 요청 (CONFIRM)]"),
                ("• 전이:", "DRAFT ➔ PENDING_LEAD")
            ]
        },
        {
            'header_title': '2단계: 법인대표',
            'header_color': C_AMBER,
            'items': [
                ("• 액션:", "1차 심사 후 감사실 상신 또는 재수정 요청"),
                ("• 버튼:", "[확인 완료 (감사팀 제출)] / [재수정 요청 (반려)]"),
                ("• 전이:", "PENDING_AUDIT 또는 REJECTED_LEAD")
            ]
        },
        {
            'header_title': '3단계: 감사담당자',
            'header_color': C_PURPLE,
            'items': [
                ("• 액션:", "증빙 대조 및 현장 심사"),
                ("• 버튼:", "[감사 검증완료 (CONFIRM)] / [재작성 요청 (보완)]"),
                ("• 전이:", "AUDIT_CONFIRMED 또는 REJECTED_AUDIT")
            ]
        },
        {
            'header_title': '4단계: 조치종료',
            'header_color': C_GREEN,
            'items': [
                ("• 상태:", "AUDIT_CONFIRMED (검증종료)"),
                ("• 잠금:", "해당 지적사항 공식 종결 및 수정 락"),
                ("• 다음:", "법인장 최종 확정 대상 포함")
            ]
        }
    ]
    add_cards_slide(prs, "CAP WORKFLOW", "개별 지적사항(CAP) 조치 및 검증 4단계 프로세스", cards_s4, 4, total_slides)

    # 5. 프로젝트 종합 검증 및 완료(Completion) 2단계
    cards_s5 = [
        {
            'header_title': '🏛️ 1단계: 법인장 최종 확정 (CONFIRM)',
            'header_color': C_BLUE_PRIMARY,
            'items': [
                ("• 화면:", "[프로젝트 최종 검증 및 확정] 화면"),
                ("• 필수 조건:", "프로젝트 내 모든 지적사항 100% 감사실 검증 완료(AUDIT_CONFIRMED) 필수"),
                ("• 주관자:", "소속 법인장 (CORP_HEAD)"),
                ("• 의미:", "피감 법인의 모든 조치가 이상 없이 완료되었음을 법인 최고책임자가 확정")
            ]
        },
        {
            'header_title': '🔒 2단계: 감사팀 최종 승인 및 완료 (Completion)',
            'header_color': C_GREEN,
            'items': [
                ("• 주관자:", "본사 감사책임자 (AUDIT_LEADER)"),
                ("• 선행 조건:", "법인장의 1단계 최종 확정 완료 건"),
                ("• 실행 버튼:", "[감사팀 최종 승인 및 완료 (Completion 실행)]"),
                ("• 시스템 효과:", "프로젝트가 '완료(Completion)' 상태로 전환되며 전 데이터 무결성 락")
            ]
        },
        {
            'header_title': '🔄 차기 프로젝트 개설 및 자동 승계',
            'header_color': C_NAVY_DARK,
            'items': [
                ("• 모태 지정:", "완료(Completion)된 프로젝트를 기반으로 신규 차기 프로젝트 개설"),
                ("• 지적사항 승계:", "개선완료 건 제외, 미완료 건(개선중/불가/지속)만 자동 복제 승계"),
                ("• 이터레이션:", "승계된 CAP은 작성중(DRAFT)으로 초기화되어 2차 개선 진행")
            ]
        }
    ]
    add_cards_slide(prs, "PROJECT COMPLETION", "프로젝트 최종 확정(CONFIRM) 및 완료(Completion) 프로세스", cards_s5, 5, total_slides)

    # 6. 메뉴별 주요 기능 매핑
    headers_s6 = ["메뉴 번호 / 명칭", "URL 경로", "주요 사용자", "핵심 기능 요약"]
    rows_s6 = [
        ["1. 프로젝트 신규 등록", "/projects", "감사팀", "신규 프로젝트 개설, 완료 프로젝트 기반 차기 프로젝트 개설 및 CAP 승계"],
        ["2. 조치계획 & 필수정보 입력", "/action-plans", "전 사용자", "조치작성(Rich Text), 증빙 첨부, 유관부서 협조의견, 상신/반려/검증"],
        ["3. 감사 지적사항 관리", "/findings", "감사팀", "CAP 신규 등록, 카테고리 관리, 다중 감사자 배정, 감사팀 예상 마감일 설정"],
        ["4. 법인별 조치율 보고", "/reports", "전 사용자", "전사/법인 통계 KPI, 엑셀 다운로드, 감사책임자 즉시 완료 및 Open 제어"],
        ["8. 프로젝트 최종 검증 및 확정", "/head-final-approval", "법인장, 감사팀", "법인 격리 조회, 법인장 1단계 확정, 감사팀 2단계 최종 승인 및 완료(Completion)"],
        ["5. 사용자 계정 관리", "/users", "시스템관리자", "회원가입 승인, 역할(Role) 배정, 소속 법인/부서 매핑, 비밀번호 초기화"],
        ["6. 화면 / 메뉴 관리", "/menus", "시스템관리자", "화면 메뉴 추가/수정/삭제, 노출 순서 변경, 내부/외부 링크 연동"],
        ["7. 역할별 화면 접근 관리", "/permissions", "시스템관리자", "역할별 메뉴 접근 제어 매트릭스 설정 (체크박스 제어)"]
    ]
    add_table_slide(prs, "MENU MAP", "시스템 전체 8대 메뉴별 기능 및 담당자 매핑", headers_s6, rows_s6, [2.5, 2.0, 2.0, 5.233], 6, total_slides)

    # 7. 조치 상태 코드 및 증빙 가이드
    cards_s7 = [
        {
            'title': '조치 상태 코드 5종 기준',
            'bg_color': C_CARD_BG,
            'items': [
                ("• 개선중 (IN_PROGRESS):", "대책 실행 중인 상태, '개선 예상 시기' 날짜 필수."),
                ("• 개선완료 (COMPLETED):", "조치 100% 완료 상태, '개선완료일자' 및 '증빙자료' 필수."),
                ("• 개선불가 (ACTION_IMPOSSIBLE):", "법규/환경상 조치 불가, 구체적 사유 필수."),
                ("• 지속관리 (CONTINUOUS_MANAGEMENT):", "정기 모니터링 필요 항목, 사후관리 방안 기술."),
                ("• 미작성 (UNWRITTEN):", "초기 등록 상태, 조치계획 수립 필요.")
            ]
        },
        {
            'title': '증빙자료 첨부 및 관리 규정',
            'bg_color': C_CARD_BG,
            'items': [
                ("• 다중 파일 지원:", "Ctrl 키를 이용해 여러 증빙 파일을 동시에 선택하여 업로드 가능."),
                ("• 파일 용량 제한:", "파일 1개당 최대 50MB 지원."),
                ("• 보안 차단 확장자:", "실행파일(.exe, .bat, .sh 등)은 보안상 업로드 자동 차단."),
                ("• 다운로드:", "등록된 파일명을 클릭하면 즉시 로컬 PC로 안전 다운로드.")
            ]
        },
        {
            'title': '데이터 무결성 락 정책',
            'bg_color': C_CARD_BG,
            'items': [
                ("• 수정/업로드 잠금:", "프로젝트가 '완료(Completion)' 상태이거나, 감사실에 제출되어 검증 대기(PENDING_AUDIT) 또는 검증 완료(AUDIT_CONFIRMED)된 건은 증빙 추가/삭제 및 조치 수정이 원천 차단됩니다.")
            ]
        }
    ]
    add_cards_slide(prs, "STANDARDS", "조치 상태 코드 및 증빙자료 첨부 관리 기준", cards_s7, 7, total_slides)

    # 8. 이력 관리 및 투명성 (타임라인)
    cards_s8 = [
        {
            'header_title': '📜 전 과정 이력 타임라인 영구 보존',
            'header_color': C_NAVY_DARK,
            'items': [
                ("• 변경자 실명 기록:", "작업자의 사번, 한글 성명, 소속 역할이 투명하게 기록됩니다."),
                ("• 처리 일시 추적:", "초 분 단위까지 정확한 처리 타임스탬프가 누적 보존됩니다."),
                ("• 코멘트 기록:", "임시저장 메모, 법인대표 반려 사유, 감사팀 보완 코멘트가 영구 보존됩니다.")
            ]
        },
        {
            'header_title': '📸 당시 조치내용 스냅샷 대조',
            'header_color': C_BLUE_PRIMARY,
            'items': [
                ("• 시점별 원본 보존:", "결재가 진행될 당시 작성되어 있던 조치 텍스트 원본이 스냅샷으로 저장됩니다."),
                ("• 원클릭 대조 열람:", "타임라인 카드에서 해당 이력을 클릭하면 당시 작성 내용을 그대로 대조 열람할 수 있어 분쟁을 방지합니다.")
            ]
        },
        {
            'header_title': '🤝 유관부서 협조 의견 누적',
            'header_color': C_PURPLE,
            'items': [
                ("• 부서 간 협업 증적:", "타 부서 담당자가 작성한 지원 내용과 협조 일시가 조치내역 하단에 시각화 박스로 자동 누적 보존됩니다.")
            ]
        }
    ]
    add_cards_slide(prs, "AUDIT TRAIL", "감사 증적을 위한 누적 이력 타임라인 및 스냅샷 관리", cards_s8, 8, total_slides)

    # 9. 전사 공통 FAQ
    cards_s9 = [
        {
            'title': 'Q1. 화면 버튼이 안 눌리거나 회색으로 보입니다.',
            'bg_color': C_BLUE_LIGHT,
            'border_color': C_BLUE_BORDER,
            'items': [
                ("체크 1:", "프로젝트가 '완료(Completion)' 상태인지 확인하세요 (완료 시 수정 차단)."),
                ("체크 2:", "법인장 확정 버튼은 모든 CAP이 '감사 검증완료' 상태여야 활성화됩니다."),
                ("체크 3:", "조치 상신 버튼은 조치 상태 및 필수 일자(예상시기/완료일자)가 채워져야 활성화됩니다.")
            ]
        },
        {
            'title': 'Q2. 타 법인 프로젝트나 지적사항이 보이지 않습니다.',
            'bg_color': C_BLUE_LIGHT,
            'border_color': C_BLUE_BORDER,
            'items': [
                ("정상 정책:", "본 시스템은 법인 분리 정책에 따라 법인 사용자(MEMBER, LEAD_REP, CORP_HEAD)는 자기 법인 데이터만 조회할 수 있습니다."),
                ("감사팀/관리자:", "감사팀(AUDITOR, AUDIT_LEADER)과 시스템관리자만 전 법인 조회가 가능합니다.")
            ]
        },
        {
            'title': 'Q3. 완료(Completion)된 프로젝트를 다시 열어야 할 때',
            'bg_color': C_BLUE_LIGHT,
            'border_color': C_BLUE_BORDER,
            'items': [
                ("오픈 권한자:", "해당 법인의 법인장(CORP_HEAD) 또는 본사 감사팀만 [완료해제(Open)] 버튼을 통해 프로젝트를 다시 오픈할 수 있습니다.")
            ]
        }
    ]
    add_cards_slide(prs, "MASTER FAQ", "전사 실무 공통 FAQ 및 문제 해결 가이드", cards_s9, 9, total_slides)

    # 10. 마무리 및 문의처
    cards_s10 = [
        {
            'title': '글로벌 세아 감사 지적사항(CAP) 관리 시스템 문의처',
            'bg_color': C_CARD_BG,
            'items': [
                ("• 본사 감사실 (업무 기준 및 결재 문의):", "감사팀 담당자 / 사내 메신저 '감사실' 채널"),
                ("• 시스템 운영팀 (계정, 권한, 전산 오류 문의):", "IT 운영팀 관리자 / 사내 헬프데스크"),
                ("• 사용자 매뉴얼 위치:", "시스템 공지사항 및 프로젝트 폴더 내 USER_MANUAL.md"),
                ("• 최신 시스템 버전:", "CAP Management System v2.0 (2026.09 기준)")
            ]
        }
    ]
    add_cards_slide(prs, "SUPPORT", "시스템 지원 및 문의 안내", cards_s10, 10, total_slides)

    prs.save(os.path.join(OUT_DIR, "CAP_Manual_Master_AllRoles.pptx"))
    print("Created CAP_Manual_Master_AllRoles.pptx")


if __name__ == "__main__":
    print("Starting PPT manual generation...")
    build_member_manual()
    build_lead_rep_manual()
    build_corp_head_manual()
    build_audit_team_manual()
    build_admin_manual()
    build_master_manual()
    print("All PPT manuals generated successfully!")
