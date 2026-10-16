/* 계정과목 사전 — 카드 도감·분류 채점·코드도움(F2)에 쓴다.
 * code: KcLep 계정 코드(⚠ verified=false 인 동안은 화면에 코드를 보여 주지 않는다 — 윈도우 KcLep에서 실측해 확정)
 * cls: 자산/부채/자본/수익/비용, grp: 화면 묶음, r: 카드 등급(N·R·SR·SSR — 헷갈리는 계정일수록 높게)
 */
window.ACCOUNTS_VERIFIED = true;   // 2026-10-16 실습실 KcLep 캡처(K06·K10b·K12)로 체계 확인. 계정과목.csv 오면 전부 대조
window.ACCOUNTS = [
  // 자산 — 당좌자산
  { code: 101, name: '현금', cls: '자산', grp: '당좌자산', r: 'N' },
  { code: 102, name: '당좌예금', cls: '자산', grp: '당좌자산', r: 'R' },
  { code: 103, name: '보통예금', cls: '자산', grp: '당좌자산', r: 'N' },
  { code: 105, name: '정기예금', cls: '자산', grp: '당좌자산', r: 'N' },
  { code: 107, name: '단기매매증권', cls: '자산', grp: '당좌자산', r: 'R' },
  { code: 108, name: '외상매출금', cls: '자산', grp: '당좌자산', r: 'N' },
  { code: 109, name: '대손충당금', cls: '자산', grp: '당좌자산', r: 'SR', minus: true },
  { code: 110, name: '받을어음', cls: '자산', grp: '당좌자산', r: 'N' },
  { code: 114, name: '단기대여금', cls: '자산', grp: '당좌자산', r: 'R' },
  { code: 116, name: '미수수익', cls: '자산', grp: '당좌자산', r: 'SR' },
  { code: 120, name: '미수금', cls: '자산', grp: '당좌자산', r: 'R' },
  { code: 131, name: '선급금', cls: '자산', grp: '당좌자산', r: 'R' },
  { code: 133, name: '선급비용', cls: '자산', grp: '당좌자산', r: 'SR' },
  { code: 134, name: '가지급금', cls: '자산', grp: '당좌자산', r: 'R' },
  { code: 136, name: '선납세금', cls: '자산', grp: '당좌자산', r: 'SR' },
  // 자산 — 재고자산
  { code: 146, name: '상품', cls: '자산', grp: '재고자산', r: 'N' },
  { code: 141, name: '현금과부족', cls: '자산', grp: '당좌자산', r: 'SR' },
  { code: 147, name: '매입환출및에누리', cls: '자산', grp: '재고자산', r: 'SR', minus: true },
  { code: 148, name: '매입할인', cls: '자산', grp: '재고자산', r: 'SR', minus: true },
  { code: 122, name: '소모품', cls: '자산', grp: '재고자산', r: 'SR' },
  // 자산 — 투자·유형
  { code: 179, name: '장기대여금', cls: '자산', grp: '투자자산', r: 'R' },
  { code: 201, name: '토지', cls: '자산', grp: '유형자산', r: 'N' },
  { code: 202, name: '건물', cls: '자산', grp: '유형자산', r: 'N' },
  { code: 206, name: '기계장치', cls: '자산', grp: '유형자산', r: 'N' },
  { code: 208, name: '차량운반구', cls: '자산', grp: '유형자산', r: 'N' },
  { code: 212, name: '비품', cls: '자산', grp: '유형자산', r: 'N' },
  { code: 232, name: '임차보증금', cls: '자산', grp: '기타비유동자산', r: 'R' },
  { code: 213, name: '감가상각누계액', cls: '자산', grp: '유형자산', r: 'SR', minus: true },
  // 부채
  { code: 251, name: '외상매입금', cls: '부채', grp: '유동부채', r: 'N' },
  { code: 252, name: '지급어음', cls: '부채', grp: '유동부채', r: 'N' },
  { code: 253, name: '미지급금', cls: '부채', grp: '유동부채', r: 'R' },
  { code: 254, name: '예수금', cls: '부채', grp: '유동부채', r: 'SSR' },
  { code: 257, name: '가수금', cls: '부채', grp: '유동부채', r: 'SR' },
  { code: 259, name: '선수금', cls: '부채', grp: '유동부채', r: 'R' },
  { code: 256, name: '당좌차월', cls: '부채', grp: '유동부채', r: 'SR' },
  { code: 260, name: '단기차입금', cls: '부채', grp: '유동부채', r: 'R' },
  { code: 262, name: '미지급비용', cls: '부채', grp: '유동부채', r: 'SR' },
  { code: 263, name: '선수수익', cls: '부채', grp: '유동부채', r: 'SR' },
  { code: 293, name: '장기차입금', cls: '부채', grp: '비유동부채', r: 'R' },
  { code: 294, name: '임대보증금', cls: '부채', grp: '비유동부채', r: 'SR' },
  { code: 295, name: '퇴직급여충당부채', cls: '부채', grp: '비유동부채', r: 'SR' },
  // 자본
  { code: 331, name: '자본금', cls: '자본', grp: '자본', r: 'N' },
  { code: 338, name: '인출금', cls: '자본', grp: '자본', r: 'SR' },
  // 수익
  { code: 401, name: '상품매출', cls: '수익', grp: '매출', r: 'N' },
  { code: 403, name: '매출할인', cls: '수익', grp: '매출', r: 'SR', minus: true },
  { code: 901, name: '이자수익', cls: '수익', grp: '영업외수익', r: 'N' },
  { code: 904, name: '임대료', cls: '수익', grp: '영업외수익', r: 'R' },
  { code: 905, name: '단기매매증권평가이익', cls: '수익', grp: '영업외수익', r: 'SSR' },
  { code: 906, name: '단기매매증권처분이익', cls: '수익', grp: '영업외수익', r: 'SR' },
  { code: 914, name: '유형자산처분이익', cls: '수익', grp: '영업외수익', r: 'SR' },
  { code: 930, name: '잡이익', cls: '수익', grp: '영업외수익', r: 'R' },
  { code: 917, name: '자산수증이익', cls: '수익', grp: '영업외수익', r: 'SR' },
  { code: 918, name: '채무면제이익', cls: '수익', grp: '영업외수익', r: 'SR' },
  // 비용 — 매출원가·판관비
  { code: 451, name: '상품매출원가', cls: '비용', grp: '매출원가', r: 'R' },
  { code: 801, name: '급여', cls: '비용', grp: '판매비와관리비', r: 'N' },
  { code: 805, name: '잡급', cls: '비용', grp: '판매비와관리비', r: 'R' },
  { code: 806, name: '퇴직급여', cls: '비용', grp: '판매비와관리비', r: 'R' },
  { code: 811, name: '복리후생비', cls: '비용', grp: '판매비와관리비', r: 'R' },
  { code: 812, name: '여비교통비', cls: '비용', grp: '판매비와관리비', r: 'N' },
  { code: 813, name: '기업업무추진비', cls: '비용', grp: '판매비와관리비', r: 'SR' },
  { code: 814, name: '통신비', cls: '비용', grp: '판매비와관리비', r: 'N' },
  { code: 815, name: '수도광열비', cls: '비용', grp: '판매비와관리비', r: 'N' },
  { code: 817, name: '세금과공과', cls: '비용', grp: '판매비와관리비', r: 'R' },
  { code: 818, name: '감가상각비', cls: '비용', grp: '판매비와관리비', r: 'R' },
  { code: 819, name: '임차료', cls: '비용', grp: '판매비와관리비', r: 'N' },
  { code: 820, name: '수선비', cls: '비용', grp: '판매비와관리비', r: 'N' },
  { code: 821, name: '보험료', cls: '비용', grp: '판매비와관리비', r: 'N' },
  { code: 822, name: '차량유지비', cls: '비용', grp: '판매비와관리비', r: 'N' },
  { code: 824, name: '운반비', cls: '비용', grp: '판매비와관리비', r: 'R' },
  { code: 825, name: '교육훈련비', cls: '비용', grp: '판매비와관리비', r: 'N' },
  { code: 826, name: '도서인쇄비', cls: '비용', grp: '판매비와관리비', r: 'N' },
  { code: 830, name: '소모품비', cls: '비용', grp: '판매비와관리비', r: 'R' },
  { code: 831, name: '수수료비용', cls: '비용', grp: '판매비와관리비', r: 'R' },
  { code: 833, name: '광고선전비', cls: '비용', grp: '판매비와관리비', r: 'N' },
  { code: 835, name: '대손상각비', cls: '비용', grp: '판매비와관리비', r: 'SR' },
  { code: 837, name: '건물관리비', cls: '비용', grp: '판매비와관리비', r: 'N' },
  // 비용 — 영업외비용
  { code: 951, name: '이자비용', cls: '비용', grp: '영업외비용', r: 'N' },
  { code: 953, name: '기부금', cls: '비용', grp: '영업외비용', r: 'R' },
  { code: 956, name: '매출채권처분손실', cls: '비용', grp: '영업외비용', r: 'SSR' },
  { code: 957, name: '단기매매증권평가손실', cls: '비용', grp: '영업외비용', r: 'SSR' },
  { code: 958, name: '단기매매증권처분손실', cls: '비용', grp: '영업외비용', r: 'SR' },
  { code: 970, name: '유형자산처분손실', cls: '비용', grp: '영업외비용', r: 'SR' },
  { code: 980, name: '잡손실', cls: '비용', grp: '영업외비용', r: 'R' }
];
// 다른 이름으로 써도 맞게 받는 것(옛 이름·흔한 줄임)
window.ACCOUNT_ALIAS = { '접대비': '기업업무추진비', '현금및현금성자산': '현금' };
window.ACCOUNT_BY_NAME = {};
window.ACCOUNTS.forEach(function (a) { window.ACCOUNT_BY_NAME[a.name] = a; });
// 거래처 입력이 필요한 계정(채권·채무)
window.PARTNER_ACCOUNTS = ['외상매출금', '받을어음', '미수금', '선급금', '단기대여금', '장기대여금', '외상매입금', '지급어음', '미지급금', '선수금', '단기차입금', '장기차입금', '가지급금', '가수금', '임차보증금', '임대보증금'];
