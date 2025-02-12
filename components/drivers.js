import React,{useState,useEffect,useMemo} from 'react'
import Image from 'next/image'
import { useGlobalState } from '../globalState'
import { doc, updateDoc } from "firebase/firestore"
import { DB } from "../firebaseConfig"
import { Modal } from "antd"
import ClipLoader from "react-spinners/ClipLoader"
import { IoIosArrowBack } from "react-icons/io"
import { IoIosArrowForward } from "react-icons/io"
import { BsArrowLeftShort } from "react-icons/bs"
import { FiPlusSquare } from "react-icons/fi"
import { FcOk } from "react-icons/fc"
import imageNotFound from '../images/NoImage.jpg'

const drivers = () => {
  const { drivers,loading } = useGlobalState()
  
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [nameFilter, setNameFilter] = useState('')
  const [monthlyCommissionFilter, setMonthlyCommissionFilter] = useState('')
  const [paidFilter, setPaidFilter] = useState("")
  const [selectedDriver,setSelectedDriver] = useState(null)
  const [expandedLine, setExpandedLine] = useState(null)
  const [processingPayment, setProcessingPayment] = useState(false)

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

  // Calculate dirver's total commission
  const calculateDriverCommission = (driver) => {
    if (!driver.line) return 0;

    return driver.line.reduce((total, li) => {
      const lineTotal = li.students.reduce(
        (sum, student) => sum + (student.monthly_sub || 0),
        0
      );
      return total + lineTotal;
    }, 0);
  };

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

  // Filtered students based on search term
  const filteredDrivers = useMemo(() => {
    return drivers
      .map((driver) => ({
        ...driver,
        totalMonthlyCommission: calculateDriverCommission(driver),
      }))
      .filter((driver) => {
        const matchesName =
          nameFilter === "" ||
          driver.driver_full_name.includes(nameFilter) ||
          driver.driver_family_name.includes(nameFilter);

        const matchesCommission =
          monthlyCommissionFilter === "" ||
          driver.totalMonthlyCommission.toString().includes(monthlyCommissionFilter);

        // Get the selected month's paycheck status
        const isPaidForSelectedMonth = driver.paycheck?.some(
          (pay) => pay.id === selectedMonth?.id && pay.paid
        )

        const matchesPaid = paidFilter === "" || (paidFilter === "yes" && isPaidForSelectedMonth) || (paidFilter === "no" && !isPaidForSelectedMonth);

        return matchesName && matchesCommission && matchesPaid;
      });
  }, [drivers, nameFilter, monthlyCommissionFilter, paidFilter,selectedMonth]);

  // Select the Driver
  const selectDriver = async(driver) => {
    setSelectedDriver(driver)
  }

  // Handle back action
  const goBack = () => {
    setSelectedDriver(null)
    setExpandedLine(null)
  };

  // Open line students list
  const toggleLine = (index) => {
    setExpandedLine((prev) => (prev === index ? null : index));
  }

  const totalAmount = selectedDriver?.line?.reduce(
    (total, line) =>
      total + line.students.reduce((sum, student) => sum + (student.monthly_sub || 0), 0),
    0
  );
  
  const isPaid = selectedDriver?.paycheck?.some((pay) => pay.id === selectedMonth?.id && pay.paid);

  // mark driver paycheck as paid
  const markPaycheckAsPaid = async () => {
    if (!selectedDriver || !selectedMonth) return;
    if (processingPayment) return;
  
    setProcessingPayment(true);
  
    try {
      const driverRef = doc(DB, "drivers", selectedDriver.id);
  
      // Find and update the correct month in paycheck array
      const updatedPaycheck = selectedDriver.paycheck.map((pay) =>
        pay.id === selectedMonth.id 
          ? { ...pay, paid: true, amount: selectedDriver.line?.reduce((total, line) =>
              total + line.students.reduce((sum, student) => sum + (student.monthly_sub || 0), 0), 0) } 
          : pay
      );
  
      // Update Firestore
      await updateDoc(driverRef, { paycheck: updatedPaycheck });

      // Show success modal
      Modal.success({
        content: `تم تسجيل استلام الراتب لشهر ${selectedMonth.month} بنجاح!`,
        centered: true,
        style: {
          textAlign: 'center',
        }
      })
  
    } catch (error) {
      console.error("Error updating paycheck:", error);
      alert("حدث خطأ أثناء تسجيل استلام الراتب");
    } finally {
      setProcessingPayment(false);
    }
  };
  

  // Render titles dynamically
  const renderTitles = () => (
    <div className='students-section-inner-titles'>

      <div className='students-section-inner-title'>
        <input 
          onChange={(e) => setNameFilter(e.target.value)}
          value={nameFilter}
          placeholder='الاسم' 
          type='text' 
          className='students-section-inner-title_search_input' 
        />
      </div>

      <div className='students-section-inner-title'>
        <input 
          onChange={(e) => setMonthlyCommissionFilter(e.target.value)}
          value={monthlyCommissionFilter}
          placeholder='مجموع اشتراكات الطلاب'
          type='text' 
          className='students-section-inner-title_search_input' 
        />
      </div>

      <div className="students-section-inner-title">
        <select 
          onChange={(e) => setPaidFilter(e.target.value)}
          value={paidFilter}
          className="students-section-inner-title_search_input"
        >
          <option value="">الحالة</option>
          <option value="yes">قبض</option>
          <option value="no">لم يقبض</option>
        </select>
      </div>

    </div>
  )

  // Render drivers list
  const renderDrivers = () => (
    <>
      {filteredDrivers.map((driver, index) => {

        // Check if the driver is paid for the selected month
        const isPaid = driver.paycheck?.some(
          (pay) => pay.id === selectedMonth?.id && pay.paid
        )

        return (
          <div key={index} onClick={() => selectDriver(driver)} className="single-item">
            <h5>{`${driver.driver_full_name} ${driver.driver_family_name}`}</h5>
            <h5>{driver.totalMonthlyCommission.toLocaleString()}</h5>
            <h5 className={isPaid ? "paid-status" : "unpaid-status"}>{isPaid ? "قبض" : "لم يقبض"}</h5>
          </div>
        );
      })}
    </>
  );

  // Loading data from DB ...
  if(loading) {
    return(
      <div className='white_card-section-container'>
        <div style={{height:'100%',width:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <ClipLoader
            color={'#955BFE'}
            loading={loading}
            size={50}
            aria-label="Loading Spinner"
            data-testid="loader"
          />
        </div>
      </div>
    )
  }

  return (
    <div className='white_card-section-container'>
      {selectedDriver ? (
        <>
          <div className="item-detailed-data-container">

            <div className='item-detailed-data-header'>
              <div className='item-detailed-data-header-title'>
                <h5 style={{marginRight:'10px'}}>{selectedDriver.driver_phone_number || '-'}</h5>  
                <h5 style={{marginRight:'3px'}}>{selectedDriver.driver_family_name}</h5>
                <h5>{selectedDriver.driver_full_name}</h5>
              </div>
              <button className="info-details-back-button" onClick={goBack}>
                <BsArrowLeftShort size={24}/>
              </button>
            </div>

            <div className="item-detailed-data-main">
              <div className="item-detailed-data-main-firstBox">
                <div className='firstBox-image-box'>
                  <Image 
                    src={selectedDriver.driver_personal_image ? selectedDriver.driver_personal_image : imageNotFound}
                    style={{ objectFit: 'cover' }}  
                    width={200}
                    height={200}
                    alt='personal'
                  />
                  <Image
                    src={selectedDriver.driver_car_image ? selectedDriver.driver_car_image : imageNotFound} 
                    style={{ objectFit: 'cover' }}
                    width={200}
                    height={200}
                    alt='car image'
                  />
                </div>
                <div className='firstBox-text-box'>
                  <div className='total-commission-box'>
                    <h5 style={{ color:'#955BFE' }}>المجموع</h5>
                    <div>
                      <h5 style={{ marginLeft: "5px" }}>
                        {selectedDriver?.line?.reduce((total, line) => 
                          total + line.students.reduce((sum, student) => sum + (student.monthly_sub || 0), 0), 
                          0
                        ).toLocaleString()} 
                      </h5>
                      <h5>د.ع</h5>
                    </div>             
                  </div>
                  <>                     
                    {isPaid ? (
                      <FcOk size={24} />
                    ) : (
                      <>
                        {processingPayment ? (
                          <div style={{height:'30px',width:'70px',backgroundColor:'#955BFE',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <ClipLoader
                              color={'#fff'}
                              loading={processingPayment}
                              size={13}
                              aria-label="Loading Spinner"
                              data-testid="loader"
                            />
                          </div>
                        ) : (
                          <button 
                            onClick={markPaycheckAsPaid} 
                            className='student-inside-modal-info-btn'
                            disabled={totalAmount === 0}
                            style={{cursor: totalAmount === 0 ? "not-allowed" : "pointer"}}
                          >
                            قبض
                          </button>
                        )}    
                      </>
                    )}                       
                  </>
                </div>
              </div>
                
              <div className="item-detailed-data-main-second-box">
                <div className="assinged-item-box-main">
                    {selectedDriver?.line.length ? (
                      <div style={{display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center'}}>
                        {selectedDriver?.line.map((line,index) => {
                          const lineTotalSub = line.students.reduce((sum, student) => sum + (student.monthly_sub || 0), 0);
                          return(
                            <div style={{width:'100%'}} key={index}>
                              <div className="assinged-item-box-item"> 
                                
                                <div className='assinged-item-box-item-data'>
                                  <h5>{line.lineName}</h5>
                                  <div>
                                    <h5>-</h5>
                                    <h5>{lineTotalSub.toLocaleString()}</h5>
                                    <h5>د.ع</h5>
                                  </div>                              
                                </div>

                                <div>
                                  <button 
                                    className="assinged-item-item-delete-button" 
                                    onClick={() => toggleLine(index)}
                                  >
                                    <FiPlusSquare size={20}/>
                                  </button>
                                </div>  

                              </div>
                              <div className={`student-dropdown ${expandedLine === index ? "student-dropdown-open" : ""}`}>
                                {line.students.length ? (
                                  <>
                                    {line.students.map((student) => (
                                        <div key={student.id} className='student-dropdown-item'>
                                          <h5>{student.name} {student.family_name}</h5>
                                          <h5>{student?.monthly_sub?.toLocaleString()}</h5>
                                        </div>                               
                                    ))}
                                  </>
                                ) : (
                                  <h5 className="no-students">لا يوجد طلاب في هذا الخط</h5>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div style={{width:'100%',textAlign:'center',marginTop:'50px'}}>
                        <h5>لا يوجد خطوط</h5>
                      </div>
                    )}
                  </div>     
              </div>
            </div>

          </div>
        </>
      ) : (
        <div>
          <div className='students-section-inner-titles'>
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

          {renderTitles()}

          {renderDrivers()}

        </div>
      )}
    </div>
  )
}

export default drivers