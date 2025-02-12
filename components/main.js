import React,{useState,useEffect,useMemo} from 'react'
import { useGlobalState } from '../globalState'
import ClipLoader from "react-spinners/ClipLoader"
import { IoIosArrowBack } from "react-icons/io"
import { IoIosArrowForward } from "react-icons/io"
import { Progress } from "antd"

const main = () => {
  const { students,loading } = useGlobalState()

  const [selectedMonth, setSelectedMonth] = useState(null)

  const months = [
    { id: 0, month: "يناير" },
    { id: 1, month: "فبراير" },
    { id: 2, month: "مارس" },
    { id: 3, month: "أبريل" },
    { id: 4, month: "مايو" },
    { id: 5, month: "يونيو" },
    { id: 6, month: "يوليو" },
    { id: 7, month: "أغسطس" },
    { id: 8, month: "سبتمبر" },
    { id: 9, month: "أكتوبر" },
    { id: 10, month: "نوفمبر" },
    { id: 11, month: "ديسمبر" },
  ];

  // Set the current month on first render
  useEffect(() => {
    const currentMonthId = new Date().getMonth();
    setSelectedMonth(months[currentMonthId]);
  }, []);

  // **Calculate statistics dynamically**
  const totalSubscriptionRevenue = useMemo(
    () =>
      students.reduce((total, student) => total + (student.monthly_sub || 0), 0),
    [students]
  );

  const companyRevenue = totalSubscriptionRevenue * 0.1; // 10% for company
  const driversPay = totalSubscriptionRevenue * 0.9; // 90% for drivers

  // **Calculate percentage of paid students in selected month**
  const paidSubscriptionPercentage = useMemo(() => {
    if (!selectedMonth || students.length === 0) return 0;

    const totalStudents = students.length;
    const paidStudents = students.filter((student) =>
      student.bill?.some((bill) => bill.id === selectedMonth.id && bill.paid)
    ).length;

    return ((paidStudents / totalStudents) * 100).toFixed(1); // Rounded to 1 decimal place
  }, [students, selectedMonth]);

  // Navigate to the previous month
  const goToPreviousMonth = () => {
    const newMonthId = selectedMonth.id - 1;
    if (newMonthId >= 0) setSelectedMonth(months[newMonthId]);
  };

  // Navigate to the next month
  const goToNextMonth = () => {
    const currentMonthId = new Date().getMonth();
    const newMonthId = selectedMonth.id + 1;
    if (newMonthId <= currentMonthId) setSelectedMonth(months[newMonthId]);
  };

  // Check if the "Previous Month" button should be disabled
  const isPreviousMonthDisabled = selectedMonth?.id === 0;

  // Check if the "Next Month" button should be disabled
  const isNextMonthDisabled = () => {
    const currentMonthId = new Date().getMonth();
    return selectedMonth?.id >= currentMonthId;
  };

  // Loading data from DB ...
  if(loading) {
    return(
      <div style={{height:'100%',width:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <ClipLoader
          color={'#955BFE'}
          loading={loading}
          size={50}
          aria-label="Loading Spinner"
          data-testid="loader"
        />
      </div>
    )
  }

  return (
    <div className='main_section_stat'>

        <div className='stats-section-inner-titles'>
          <div className='students-section-inner-title'>
            <div className='months-btn-container'>
              <button 
                onClick={goToPreviousMonth}
                disabled={isPreviousMonthDisabled}
                className="month-nav-btn"
                style={{ opacity: isPreviousMonthDisabled ? 0.5 : 1 }}
              >
                <IoIosArrowBack size={22}/>             
              </button>
              <div className="current-month">
                <p>{selectedMonth?.month}</p>
              </div>       
              <button 
                onClick={goToNextMonth}
                disabled={isNextMonthDisabled()}
                className="month-nav-btn"
                style={{ opacity: isNextMonthDisabled() ? 0.5 : 1 }}
              >
                <IoIosArrowForward size={22}/>
              </button>
            </div>
          </div>
        </div>

        <div className='stats-section-inner-first-box'>
          <p>الإحصاءات الإجمالية</p>
          <div className='stats-section-inner-first-box-sections'>

            <div>
              <div className='stats-section-inner-first-box-sections-amount'>
                <h4>{totalSubscriptionRevenue.toLocaleString()}</h4>
                <h4>د.ع</h4>
              </div>                      
              <h5>العائد الجملي</h5>
            </div>

            <div>
              <div className='stats-section-inner-first-box-sections-amount'>
                <h4>{companyRevenue.toLocaleString()}</h4>
                <h4>د.ع</h4>
              </div>            
              <h5>عائدات الشركة</h5>            
            </div>

            <div>
              <div className='stats-section-inner-first-box-sections-amount'>
                <h4>{driversPay.toLocaleString()}</h4>
                <h4>د.ع</h4>
              </div>
              <h5>اجور السواق</h5>            
            </div>

          </div>       
        </div>

        <div className='stats-section-inner-second-box'>
          <p>نسبة الاشتراكات المدفوعة</p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Progress
              type="circle"
              percent={paidSubscriptionPercentage}
              format={(percent) => `${percent}%`}
              strokeColor="#955BFE"
            />
          </div>
        </div>


    </div>
  )
}

export default main