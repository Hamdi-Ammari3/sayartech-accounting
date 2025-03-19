import React,{useState} from 'react'
import Image from 'next/image'
import { useGlobalState } from '../globalState'
import { doc,getDoc,writeBatch} from "firebase/firestore"
import { DB } from "../firebaseConfig"
import { Modal } from "antd"
import { format, subMonths, addMonths } from 'date-fns'
import { ar } from 'date-fns/locale'
import ClipLoader from "react-spinners/ClipLoader"
import * as XLSX from "xlsx"
import { IoIosArrowBack } from "react-icons/io"
import { IoIosArrowForward } from "react-icons/io"
import { BsArrowLeftShort } from "react-icons/bs"
import { FiPlusSquare } from "react-icons/fi"
import { FcOk } from "react-icons/fc"
import imageNotFound from '../images/NoImage.jpg'
import excel from '../images/excel.png'

const drivers = () => {
  const { drivers,riders } = useGlobalState()

  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Baghdad" }));
  const year = today.getFullYear();
  
  const [selectedDriver,setSelectedDriver] = useState(null)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [nameFilter, setNameFilter] = useState('')
  const [showCompWageModal, setShowCompWageModal] = useState(false)
  const [paidFilter, setPaidFilter] = useState("")
  const [expandedLine, setExpandedLine] = useState(null)
  const [isEditingPaymentStatus,setIsEditingPaymentStatus] = useState(false)

  const currentMonthKey = `${year}-${String(selectedMonth).padStart(2, "0")}`;

  // Function to move to the previous month
  const handlePrevMonth = () => {
    const prevDate = subMonths(new Date(selectedYear, selectedMonth - 1), 1);
    setSelectedYear(prevDate.getFullYear());
    setSelectedMonth(prevDate.getMonth() + 1);
  }

  // Function to move to the next month
  const handleNextMonth = () => {
    const nextDate = addMonths(new Date(selectedYear, selectedMonth - 1), 1);
    setSelectedYear(nextDate.getFullYear());
    setSelectedMonth(nextDate.getMonth() + 1);
  }

  // Filter Drivers based on inputs
  const filteredDrivers = drivers.filter((driver) => {
    const paycheck = driver.wage?.[currentMonthKey] || {};
    const matchesName = nameFilter ? driver.driver_full_name.includes(nameFilter) : true;
    //const matchesMonthly = monthlyCommissionFilter ? bill.driver_commission_amount?.toString().includes(monthlyAmountFilter) : true;
    const matchesPaid = paidFilter === "yes" ? paycheck.paid === true : paidFilter === "no" ? paycheck.paid === false : true;
  
    return matchesName && matchesPaid;
  })

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

  // Function to fetch riders and total bill for a given line
  const getRidersForLine = (line) => {
    if (!Array.isArray(line.riders)) return { filteredRiders: [], lineTotalSub: 0 };

    const filteredRiders = line.riders
      .map((riderRef) => {
        const fullRider = riders.find((rider) => rider.id === riderRef.id); // Find full rider data
        if (!fullRider) return null;

        return {
          id: fullRider.id,
          name: fullRider.full_name,
          family_name: fullRider.family_name,
          billAmount: fullRider.bill?.[currentMonthKey]?.active ? fullRider.bill[currentMonthKey]?.driver_commission_amount || 0 : 0
        };
      })
      .filter(Boolean); // Remove null values

    const lineTotalSub = filteredRiders.reduce((sum, rider) => sum + rider.billAmount, 0);

    return { filteredRiders, lineTotalSub };
  };

  // Arabic month names
  const arabicMonths = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];

  const complementaryWage = selectedDriver?.complementaryWages?.[currentMonthKey] || null;

  const fetchComWageRiders = (riderID) => {
    return riders.find(r => r.id === riderID) || { full_name: "غير معروف", family_name: "", destination: "--" };
  }

  // close the complementary wages modal
  const handleCloseComWageModal = () => {
    setShowCompWageModal(false);
  }

  // Calculate total complementary wage amount
  let totalComplementaryWage = 0;
  if(complementaryWage) {
    totalComplementaryWage = complementaryWage?.reduce((sum, wage) => sum + (wage.amount || 0), 0);
  } else {
    totalComplementaryWage = 0;
  }
  
  // Calculate the total amount from all lines
  const totalLineAmount = selectedDriver?.line?.reduce((acc, line) => {
    const { lineTotalSub } = getRidersForLine(line);
    return acc + lineTotalSub;
  }, 0);

  // Calculate the final total amount
  const finalTotalAmount = totalLineAmount + totalComplementaryWage;

  // Driver wage status
  const currentWageStatus = selectedDriver?.wage?.[currentMonthKey]?.paid || false;

  const editWagePaidStatusHandler = async () => {
    if (!selectedDriver || !currentMonthKey) return;
  
    setIsEditingPaymentStatus(true); // Start loading
  
    try {
      const driverRef = doc(DB, "drivers", selectedDriver.id);
      const driverDoc = await getDoc(driverRef);
  
      if (!driverDoc.exists()) {
        alert("الحساب غير موجود");
        return;
      }
  
      const driverData = driverDoc.data();
      const updatedWage = { ...driverData.wage };
  
      if (!updatedWage[currentMonthKey]) {
        alert("لا توجد أجور لهذا الشهر");
        return;
      }
  
      if (updatedWage[currentMonthKey].paid) {
        alert("تم دفع الأجر بالفعل");
        return;
      }
  
      const batch = writeBatch(DB);
  
      // Update the wage's paid status
      updatedWage[currentMonthKey].paid = true;
      batch.update(driverRef, { wage: updatedWage });
  
      // Commit batch update
      await batch.commit();
  
      // Update local state (Optimistic update)
      setSelectedDriver((prev) => ({
        ...prev,
        wage: {
          ...prev.wage,
          [currentMonthKey]: { paid: true },
        },
      }));
  
      alert("تم تحديث حالة الدفع بنجاح");
  
    } catch (error) {
      console.error("Error updating wage status:", error);
      alert("حدث خطأ أثناء تحديث حالة الدفع");
    } finally {
      setIsEditingPaymentStatus(false); // Stop loading
    }
  };

  // Export riders list as excel file
  const exportToExcel = () => {
    // Define the file name based on selected month and year
    const fileName = `Sayartech_Drivers_${selectedYear}-${String(selectedMonth).padStart(2, "0")}.xlsx`;
    const sheetName = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
    
    // Prepare Data for Export
    const data = filteredDrivers.map((driver) => {
      const paycheckData = driver.wage?.[currentMonthKey];

      const totalCommission = driver.line
      ?.flatMap((line) => line.riders)
      ?.map((riderRef) => {
        const fullRider = riders.find((rider) => rider.id === riderRef.id);
        return fullRider?.bill?.[currentMonthKey]?.active ? fullRider.bill[currentMonthKey]?.driver_commission_amount || 0 : 0;
      })
      ?.reduce((sum, amount) => sum + amount, 0);

      const complementaryWage = driver?.complementaryWages?.[currentMonthKey] || [];
      const totalComplementaryWage = complementaryWage
        ?.map(({ amount }) => amount)
        ?.reduce((sum, amount) => sum + amount, 0);

      const totalWage = totalCommission + totalComplementaryWage;
        
      return {
        "الاسم": driver.driver_full_name,
        "الاجرة الشهري (دينار)": totalWage.toLocaleString(),
        "الحالة": paycheckData?.paid ? "قبض" : "لم يقبض",
      };
    });
    
    // Convert Data to a Worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Create Workbook and Append Sheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    // Save File
    XLSX.writeFile(wb, fileName);
  };
  
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
                      <h5>{finalTotalAmount.toLocaleString()}</h5>
                      <h5 style={{marginRight:'4px'}}>دينار</h5>
                    </div>             
                  </div>
                  <div className='paid-paycheck'>
                    <h5 style={{marginLeft:'5px'}}>{currentWageStatus ? 'قبض':'لم يقبض'}</h5>
                    {!currentWageStatus ? (
                      <>
                        {isEditingPaymentStatus ? (
                          <div style={{ width:'60px',height:'25px',backgroundColor:'#007bff',borderRadius:'7px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <ClipLoader
                              color={'#fff'}
                              loading={isEditingPaymentStatus}
                              size={10}
                              aria-label="Loading Spinner"
                              data-testid="loader"
                            />
                          </div>
                        ) : (
                          <h5 
                            className='rider-edit-bill-btn'
                            onClick={editWagePaidStatusHandler}
                          >
                            تعديل
                          </h5>
                        )}                          
                      </>    
                    ) : (
                      <FcOk size={18}/>
                    )}                    
                  </div>                                     
                </div>
              </div>
              <div className="item-detailed-data-main-second-box">               
                <div className="assinged-item-box-main">
                  <div style={{display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center'}}>
                    {selectedDriver?.line.map((line, index) => {
                      const { filteredRiders, lineTotalSub } = getRidersForLine(line);                      
                      return(
                        <div style={{width:'100%'}} key={index}>
                          <div className="assinged-item-box-item">                               
                            <div className='assinged-item-box-item-data'>
                              <h5>{line.lineName}</h5>
                              <div>
                                <h5>-</h5>
                                <h5>{lineTotalSub.toLocaleString()}</h5>
                                <h5>دينار</h5>
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
                            {filteredRiders.length ? (
                              <>
                                {filteredRiders.map((rider) => (
                                  <div key={rider.id} className='student-dropdown-item'>
                                    <h5>{rider.name} {rider.family_name}</h5>
                                    <h5>{rider.billAmount.toLocaleString()}</h5>
                                  </div>                               
                                ))}
                              </>
                            ) : (
                              <h5 className="no-students">لا يوجد ركاب في هذا الخط</h5>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {/* Complementary Wage Section */}
                    {complementaryWage?.length > 0 && (
                      <div className="assinged-item-box-item" style={{marginTop:'20px'}}>                        
                        <h5
                          onClick={() => setShowCompWageModal(true)}
                          className="rider-complement-bill-btn"
                        >
                          تفاصيل
                        </h5>
                        <h5>أجور الركاب المنقطعين: {totalComplementaryWage.toLocaleString()} دينار</h5>
                      </div>
                    )}
                    <Modal 
                      title="أجور الركاب المنقطعين"
                      open={showCompWageModal}
                      onCancel={handleCloseComWageModal}
                      footer={null}
                      centered                      
                    >
                      {complementaryWage?.map(({ start_date, end_date, amount, rider_id }, index) => {
                        const riderData = fetchComWageRiders(rider_id)
                        const compStart = new Date(start_date)
                        const compEnd = new Date(end_date)

                        return (
                          <div key={index} className='rider-complement-bill-details' style={{height:'120px'}}>
                            <p>الراكب: {riderData?.full_name} {riderData?.family_name}</p>
                            <p>الوجهة: {riderData?.destination}</p>
                            <p>
                              من {compStart.getDate()} {arabicMonths[compStart.getMonth()]} إلى {compEnd.getDate()} {arabicMonths[compEnd.getMonth()]}
                            </p>
                            <p>المبلغ: {amount.toLocaleString()} دينار</p>
                          </div>
                        );
                      })}
                    </Modal>
                  </div>
                </div>  
              </div>
            </div>
          </div>
        </>
      ) : (
        <div>
          <div className='students-section-inner-titles'>
            <div className='students-section-inner-title'>
              <button className='excel-btn' onClick={exportToExcel}>
                <Image src={excel} width={20} height={20} alt='excel'/>
              </button>
              <div className='months-btn-container'>
                <button 
                  onClick={handlePrevMonth}
                  disabled={selectedMonth === 1}
                  className="month-nav-btn"
                  style={{ opacity: selectedMonth === 1 ? 0.5 : 1 }}
                >
                  <IoIosArrowBack size={22}/>             
                </button>
                <div className="current-month">
                  <p>{format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy', { locale: ar })}</p>
                </div>       
                <button 
                  onClick={handleNextMonth}
                  disabled={selectedMonth >= new Date().getMonth() + 1} // Prevent going beyond current month
                  className="month-nav-btn"
                  style={{ opacity: selectedMonth >= new Date().getMonth() + 1 ? 0.5 : 1 }}
                >
                  <IoIosArrowForward size={22}/>
                </button>
              </div>
            </div>
          </div>
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
                placeholder='الاجرة'
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
          <div className='all-items-list'>
            {filteredDrivers.map((driver,index) => {
              const paycheckData = driver.wage?.[currentMonthKey];

              // Step 1: Calculate Total Commission from Riders
              const totalCommission = driver.line
              ?.flatMap((line) => line.riders)
              ?.map((riderRef) => {
                const fullRider = riders.find((rider) => rider.id === riderRef.id);
                return fullRider?.bill?.[currentMonthKey]?.active ? fullRider.bill[currentMonthKey]?.driver_commission_amount || 0 : 0;
              })
              ?.reduce((sum, amount) => sum + amount, 0);

              // Step 2: Calculate Complementary Wage for the Driver
              const complementaryWage = driver?.complementaryWages?.[currentMonthKey] || [];
              const totalComplementaryWage = complementaryWage
                ?.map(({ amount }) => amount)
                ?.reduce((sum, amount) => sum + amount, 0);

              // Step 3: Calculate Final Total Wage (Riders' Commission + Complementary Wage)
              const totalWage = totalCommission + totalComplementaryWage;

              return(
                <div key={index} onClick={() => selectDriver(driver)} className="single-item">
                  <div>
                    <h5>{`${driver.driver_full_name} ${driver.driver_family_name}`}</h5>
                  </div>
                  <div>
                    <h5>{totalWage.toLocaleString()}</h5>
                  </div>
                  <div>
                    <h5 className={paycheckData?.paid ? "paid-status" : "unpaid-status"}>{paycheckData?.paid ? "قبض" : "لم يقبض"}</h5>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default drivers