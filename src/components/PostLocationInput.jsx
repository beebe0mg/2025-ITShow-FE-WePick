import React, { useEffect, useState, useRef } from 'react';
import styles from '../styles/CreatePostPage.module.css'
import InputWrapper from './InputWrapper';
import axios from 'axios';

// // API 기본 설정
// const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

const PostLocationInput = ({ value, onChange }) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false); // 드롭다운 상태
  const [showMap, setShowMap] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const mapRef = useRef(null);
  const searchInputRef = useRef(null);
  const debounceTimerRef = useRef(null);
  // 카테고리별 아이콘 매핑
  const getCategoryIcon = (categoryName) => {
    if (!categoryName) return '📍';

    const category = categoryName.toLowerCase();

    if (category.includes('음식점') || category.includes('카페') || category.includes('식당')) {
      return '🍽️';
    } else if (category.includes('숙박')) {
      return '🏨';
    } else if (category.includes('관광') || category.includes('명소')) {
      return '🏛️';
    } else if (category.includes('쇼핑') || category.includes('마트')) {
      return '🛒';
    } else if (category.includes('병원') || category.includes('의료')) {
      return '🏥';
    } else if (category.includes('학교') || category.includes('교육')) {
      return '🏫';
    } else if (category.includes('은행') || category.includes('금융')) {
      return '🏦';
    } else if (category.includes('주유소') || category.includes('자동차')) {
      return '⛽';
    } else if (category.includes('공원') || category.includes('자연')) {
      return '🌳';
    } else if (category.includes('문화') || category.includes('예술')) {
      return '🎭';
    } else if (category.includes('스포츠') || category.includes('운동')) {
      return '⚽';
    } else {
      return '📍';
    }
  };

  // 장소 이미지 가져오기 함수
  const getPlaceImage = async (place) => {
    try {
      // Kakao Place Details API를 사용하여 장소 상세 정보 및 이미지 가져오기
      const KAKAO_API_KEY = import.meta.env.VITE_KAKAO_API_KEY;

      // REST API를 사용하여 장소 상세 정보 가져오기
      const response = await axios.get(`https://dapi.kakao.com/v2/local/search/keyword.json`, {
        headers: {
          Authorization: `KakaoAK ${KAKAO_API_KEY}`
        },
        params: {
          query: place.place_name,
          x: place.x,
          y: place.y,
          radius: 100
        }
      });

      // 응답에서 이미지 URL 추출 (있는 경우)
      if (response.data.documents && response.data.documents.length > 0) {
        const placeDetail = response.data.documents[0];
        return placeDetail.image_url || null;
      }

      return null;
    } catch (error) {
      console.error('장소 이미지 가져오기 실패:', error);
      return null;
    }
  };

  // PlaceImageComponent - 장소 이미지 또는 카테고리 아이콘 표시
  const PlaceImageComponent = ({ place, className }) => {
    const [imageUrl, setImageUrl] = useState(null);
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
      if (place && !imageError) {
        // 실제 이미지를 가져오는 로직 (선택사항)
        // getPlaceImage(place).then(setImageUrl);

        // 또는 Google Places나 다른 서비스의 이미지 URL 사용
        // 예: Google Street View Static API
        const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=100x100&location=${place.y},${place.x}&key=YOUR_GOOGLE_API_KEY`;
        // setImageUrl(streetViewUrl);
      }
    }, [place, imageError]);

    if (imageUrl && !imageError) {
      return (
        <img
          src={imageUrl}
          alt={place?.place_name || '장소'}
          className={className}
          onError={() => setImageError(true)}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            objectFit: 'cover'
          }}
        />
      );
    }

    // 이미지가 없으면 카테고리 아이콘 표시
    return (
      <div className={className} style={{
        width: '40px',
        height: '40px',
        borderRadius: '8px',
        backgroundColor: '#f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px'
      }}>
        {getCategoryIcon(place?.category_name)}
      </div>
    );
  };

  // 카카오 SDK 로드 확인
  useEffect(() => {
    // 카카오 SDK가 로드될 때까지 대기
    const checkKakaoSDK = () => {
      if (window.kakao && window.kakao.maps) {
        console.log('카카오 지도 SDK 로드 완료');
      } else {
        console.warn('카카오 지도 SDK가 로드되지 않았습니다.');
      }
    };

    // 페이지 로드 후 SDK 확인
    if (document.readyState === 'complete') {
      checkKakaoSDK();
    } else {
      window.addEventListener('load', checkKakaoSDK);
      return () => window.removeEventListener('load', checkKakaoSDK);
    }
  }, []);

  // 검색 모달이 열릴 때 입력 필드에 자동 포커스
  useEffect(() => {
    if (showSearchModal && searchInputRef.current) {
      // 모달 애니메이션이 끝난 후 포커스를 주기 위해 약간의 지연
      const timer = setTimeout(() => {
        searchInputRef.current.focus();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [showSearchModal]);

  // 실시간 검색을 위한 디바운스 효과
  useEffect(() => {
    if (query.trim() && showSearchModal) {
      // 기존 타이머 취소
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // 새로운 타이머 설정 (300ms 후 검색 실행)
      debounceTimerRef.current = setTimeout(() => {
        handleSearch();
      }, 300);
    } else if (!query.trim()) {
      // 검색어가 없으면 결과 초기화
      setSearchResults([]);
    }

    // 컴포넌트 언마운트 시 타이머 정리
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, showSearchModal]);

  const handleSearch = async () => {
    if (!query.trim() || !window.kakao) {
      if (!window.kakao) {
        alert('카카오 지도 SDK가 로드되지 않았습니다.');
        return;
      }
      return;
    }

    setIsLoading(true);

    try {
      // 카카오 지도 SDK의 Places 서비스 사용
      const ps = new window.kakao.maps.services.Places();

      ps.keywordSearch(query, (data, status) => {
        setIsLoading(false);

        if (status === window.kakao.maps.services.Status.OK) {
          console.log('검색 결과:', data);
          setSearchResults(data);
        } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
          console.log('검색 결과가 없습니다.');
          setSearchResults([]);
        } else {
          console.error('검색 오류:', status);
          setSearchResults([]);
          alert('검색 중 오류가 발생했습니다.');
        }
      }, {
        size: 10 // 검색 결과 개수
      });

    } catch (error) {
      setIsLoading(false);
      console.error('검색 중 에러 발생:', error);
      alert('검색 중 오류가 발생했습니다.');
    }
  };

  // 장소 선택
  const handleSelectedPlace = async (place) => {
    setSelectedPlace(place);
    setSearchResults([]);
    setQuery('')
    setShowSearchModal(false);
    setShowDropdown(false); // 드롭다운 닫기
    onChange(place.place_name);
  };

  // 메인 입력 필드 클릭 처리
  const handleMainInputClick = () => {
    if (selectedPlace) {
      // 장소가 선택된 경우 드롭다운 토글
      setShowDropdown(!showDropdown);
    } else {
      // 장소가 선택되지 않은 경우 검색 모달 열기
      setShowSearchModal(true);
    }
  };

  // 장소 삭제
  const handleRemovePlace = () => {
    setSelectedPlace(null);
    setShowDropdown(false);
    onChange('');
    // try {
    //   // API_BASE_URL도 안전하게 처리
    //   const apiBaseUrl = typeof process !== 'undefined' && process.env?.REACT_APP_API_BASE_URL
    //     ? import.meta.env.REACT_APP_API_BASE_URL
    //     : 'http://localhost:3001/api';
    //   // 필요한 경우 백엔드에서도 임시 저장된 장소 정보 삭제
    //   if (selectedPlace) {
    //     await axios.delete(`${apiBaseUrl}/location/temp/${selectedPlace.id}`, {
    //       headers: {
    //         'Content-Type': 'application/json',
    //       }
    //     });
    //   }
    // } catch (error) {
    //   console.error('장소 삭제 처리 중 에러:', error);
    // } finally {
    //   setSelectedPlace(null);
    //   setShowDropdown(false);
    //   onChange('');
    // }
  };


  // 지도 표시
  useEffect(() => {
    if (showMap && selectedPlace && window.kakao && mapRef.current) {
      const container = mapRef.current;
      const options = {
        center: new window.kakao.maps.LatLng(selectedPlace.y, selectedPlace.x),
        level: 3
      };
      const map = new window.kakao.maps.Map(container, options);

      // 마커 추가
      const marker = new window.kakao.maps.Marker({
        map: map,
        position: new window.kakao.maps.LatLng(selectedPlace.y, selectedPlace.x)
      });

      const infoWindow = new window.kakao.maps.InfoWindow({
        content: `<div style="padding:5px;font-size:12px">${selectedPlace.place_name}</div>`
      });
      infoWindow.open(map, marker);
    }
  }, [showMap, selectedPlace]);

  // Enter 처리
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <InputWrapper label="위치(지점)">
      {/* 메인 입력 필드 */}
      <div className={styles.locationInputContainer}>
        {/* <div className={styles.locationInputField} onClick={() => setShowSearchModal(true)}> */}
        <div className={`${styles.locationInputField} ${showDropdown ? styles.dropdownExpanded : ''}`} onClick={handleMainInputClick}>
          {/* 장소 선택 전: 오른쪽에만 locationIcon */}
          {!selectedPlace && (
            <>
              <span className={styles.placeholderText}>
                클릭해서 사진을 찍은 위치와 지점을 입력해 주세요.
              </span>
              <div className={styles.locationIcon}>
                <svg width="18" height="22" viewBox="0 0 18 27" fill="none">
                  <path d="M9 12.8571C8.14752 12.8571 7.32995 12.5185 6.72716 11.9157C6.12436 11.3129 5.78571 10.4953 5.78571 9.64282C5.78571 8.79034 6.12436 7.97277 6.72716 7.36998C7.32995 6.76718 8.14752 6.42854 9 6.42854C9.85248 6.42854 10.67 6.76718 11.2728 7.36998C11.8756 7.97277 12.2143 8.79034 12.2143 9.64282C12.2143 10.0649 12.1311 10.4829 11.9696 10.8729C11.8081 11.2629 11.5713 11.6172 11.2728 11.9157C10.9744 12.2141 10.62 12.4509 10.2301 12.6124C9.84008 12.774 9.42211 12.8571 9 12.8571ZM9 0.642822C6.61305 0.642822 4.32387 1.59103 2.63604 3.27886C0.948211 4.96669 0 7.25587 0 9.64282C0 16.3928 9 26.3571 9 26.3571C9 26.3571 18 16.3928 18 9.64282C18 7.25587 17.0518 4.96669 15.364 3.27886C13.6761 1.59103 11.3869 0.642822 9 0.642822Z" fill="#939393" />
                </svg>
              </div>
            </>
          )}

          {/* 장소 선택 후: 왼쪽에 locationIcon + 장소명/주소 + 오른쪽에 expandIcon */}
          {selectedPlace && (
            <>
              <div className={styles.locationIconAfter}>
                <svg width="18" height="22" viewBox="0 0 18 27" fill="none">
                  <path d="M9 12.8571C8.14752 12.8571 7.32995 12.5185 6.72716 11.9157C6.12436 11.3129 5.78571 10.4953 5.78571 9.64282C5.78571 8.79034 6.12436 7.97277 6.72716 7.36998C7.32995 6.76718 8.14752 6.42854 9 6.42854C9.85248 6.42854 10.67 6.76718 11.2728 7.36998C11.8756 7.97277 12.2143 8.79034 12.2143 9.64282C12.2143 10.0649 12.1311 10.4829 11.9696 10.8729C11.8081 11.2629 11.5713 11.6172 11.2728 11.9157C10.9744 12.2141 10.62 12.4509 10.2301 12.6124C9.84008 12.774 9.42211 12.8571 9 12.8571ZM9 0.642822C6.61305 0.642822 4.32387 1.59103 2.63604 3.27886C0.948211 4.96669 0 7.25587 0 9.64282C0 16.3928 9 26.3571 9 26.3571C9 26.3571 18 16.3928 18 9.64282C18 7.25587 17.0518 4.96669 15.364 3.27886C13.6761 1.59103 11.3869 0.642822 9 0.642822Z" fill="#939393" />
                </svg>
              </div>
              <div className={styles.selectedLocationText}>
                <h3 className={styles.placeName}>{selectedPlace.place_name}</h3>
              </div>

              <div
                className={`${styles.expandIcon} ${showDropdown ? styles.expanded : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDropdown(!showDropdown);
                }}
              ><svg width="28" height="16" viewBox="1 0 8 7" fill="none">
                  <path d="M1 1L6 6L11 1" stroke="#939393" strokeWidth="1.3" />
                </svg></div>
              {/* </div> */}
            </>
          )}
        </div>

        {/* 선택된 장소 상세 정보 (기존 selectedPlace 섹션) */}
        {selectedPlace && showDropdown && (
          // <div className={styles.selectedPlace}>
          //   <div className={styles.placeInfo}>
          //     <div className={styles.placeImage}>
          <div className={styles.dropdown}>
            <div className={styles.selectedPlaceInfo}>
              <div className={styles.placeImageContainer}>
                <PlaceImageComponent
                  place={selectedPlace}
                  className={styles.placeThumbnail}
                />
              </div>
              <div className={styles.placeDetails}>
                <h3 className={styles.placeName}>{selectedPlace.place_name}</h3>
                <p className={styles.placeAddress}>
                  {selectedPlace.road_address_name || selectedPlace.address_name}
                </p>
                <div className={styles.dropdownActions}>
                  <button
                    className={styles.viewMapButton}
                    onClick={() => setShowMap(true)}
                  >
                    지점 확인하기
                  </button>
                  <button
                    className={styles.removeLocationButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemovePlace();
                    }}
                  >
                    위치 삭제
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 검색 모달 */}
      {showSearchModal && (
        <div className={styles.searchModalOverlay} onClick={() => setShowSearchModal(false)}>
          <div className={styles.searchModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.searchHeader}>
              <h2>위치 검색</h2>
              <button className={styles.closeButton}
                onClick={() => setShowSearchModal(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.searchInputContainer}>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="장소명을 입력하세요"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className={styles.searchInput} />
              <button
                className={styles.searchButton}
                onClick={handleSearch}
                disabled={isLoading}>
                {isLoading ? '검색중...' : '검색'}
              </button>
            </div>

            <div className={styles.searchResults}>
              {searchResults.length > 0 ? (
                <ul className={styles.resultsList}>
                  {searchResults.map((place) => (
                    <li
                      key={place.id}
                      className={styles.resultItem}
                      onClick={() => handleSelectedPlace(place)}
                    >
                      <div className={styles.resultIcon}>
                        <PlaceImageComponent
                          place={place}
                          className={styles.resultPlaceImage}
                        />
                      </div>
                      {/* <div className={styles.resultIcon}>📍</div> */}
                      <div className={styles.resultInfo}>
                        <div className={styles.resultName}>{place.place_name}</div>
                        <div className={styles.resultAddress}>
                          {place.road_address_name || place.address_name}
                        </div>
                        {place.category_name && (
                          <div className={styles.resultCategory}>{place.category_name}</div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : query && !isLoading ? (
                <div className={styles.noResults}>검색 결과가 없습니다.</div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* 지도 모달 */}
      {showMap && selectedPlace && (
        <div className={styles.mapModalOverlay} onClick={() => setShowMap(false)}>
          <div className={styles.mapModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.mapHeader}>
              <h3>{selectedPlace.place_name}</h3>
              <button className={styles.closeBtn} onClick={() => setShowMap(false)}>
                ✕
              </button>
            </div>
            <div ref={mapRef} className={styles.mapContainer}></div>
          </div>
        </div>
      )}
    </InputWrapper >
  );
};

export default PostLocationInput;