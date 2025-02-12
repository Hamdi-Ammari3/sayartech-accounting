'use client';
import React, { createContext, useReducer, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { DB } from './firebaseConfig';

const GlobalStateContext = createContext();

const initialState = {
  students: [],
  drivers: [],
  schools: [],
  loading: true,
  error: null,
};

const globalStateReducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_SUCCESS':
      return {
        ...state,
        ...action.payload,
        loading: false,
      };
    case 'FETCH_ERROR':
      return {
        ...state,
        error: action.error,
        loading: false,
      };
    default:
      return state;
  }
};

export const GlobalStateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(globalStateReducer, initialState);

  useEffect(() => {
    
    const unsubscribeStudents = onSnapshot(collection(DB, 'students'), (snapshot) => {
      const students = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      dispatch({
        type: 'FETCH_SUCCESS',
        payload: { students },
      });
    });

    const unsubscribeDrivers = onSnapshot(collection(DB, 'drivers'), (snapshot) => {
      const drivers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      dispatch({
        type: 'FETCH_SUCCESS',
        payload: { drivers },
      });
    });

    const unsubscribeSchools = onSnapshot(collection(DB, 'schools'), (snapshot) => {
      const schools = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      dispatch({
        type: 'FETCH_SUCCESS',
        payload: { schools },
      });
    });

    // Cleanup listeners on unmount
    return () => {
      unsubscribeStudents();
      unsubscribeDrivers();
      unsubscribeSchools();
    };
  }, []);

  return (
    <GlobalStateContext.Provider value={state}>
      {children}
    </GlobalStateContext.Provider>
  );
};

export const useGlobalState = () => React.useContext(GlobalStateContext);
