import React,{useState} from 'react'
import Image from 'next/image'
import { useGlobalState } from '../globalState'
import { doc,getDoc,writeBatch} from "firebase/firestore"
import { DB } from "../firebaseConfig"
import { format, subMonths, addMonths } from 'date-fns'
import { ar } from 'date-fns/locale'
import { Modal } from "antd"
import ClipLoader from "react-spinners/ClipLoader"
import * as XLSX from "xlsx"
import { IoIosArrowBack } from "react-icons/io"
import { IoIosArrowForward } from "react-icons/io"
import { FcMediumPriority } from "react-icons/fc"
import { BsArrowLeftShort } from "react-icons/bs"
import { FcOk } from "react-icons/fc"
import { FaCaretUp } from "react-icons/fa6"
import { FaCaretDown } from "react-icons/fa6"
import { FiPlusSquare } from "react-icons/fi"
import money from '../images/dollar.png'
import miniVan from '../images/minivan.png'
import excel from '../images/excel.png'

const schools = () => {
    const { riders,drivers,schools } = useGlobalState()

    const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Baghdad" }))
    const year = today.getFullYear()

    const [selectedSchool,setSelectedSchool] = useState(null)
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
    const [nameFilter, setNameFilter] = useState("")
    const [studentCountSortDirection, setStudentCountSortDirection] = useState(null)
    const [billAmountSortDirection, setBillAmountSortDirection] = useState(null)
    const [studentsNumberFilter,setStudentsNumberFilter] = useState("")
    const [monthlyAmountFilter, setMonthlyAmountFilter] = useState("")
    const [expandedLine, setExpandedLine] = useState(null)

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

    // Compute total monthly bill for each school
    const enrichedSchools = schools.map((school) => {
        // Filter students belonging to this school
        const schoolStudents = riders.filter(student => student.destination === school.name);

        // Calculate total monthly bill
        const totalBillAmount = schoolStudents.reduce((sum, student) => {
            const billForMonth = student.bill?.[currentMonthKey] || {};

            // Skip student if no bill for this month OR not active
            if (!billForMonth || !billForMonth.active) return sum;
        
            // Extract complementary bill array for the month (default empty array if not found)
            const complementaryBills = student.complementary_bill?.[currentMonthKey] || [];

            // Sum all complementary amounts for the selected month
            const totalComplementaryAmount = complementaryBills.reduce((compSum, comp) => compSum + (comp.amount || 0), 0);

            // Sum up company and driver commissions
            const studentTotal = (billForMonth.company_commission_amount || 0) + 
                                 (billForMonth.driver_commission_amount || 0) + 
                                 totalComplementaryAmount;

            return sum + studentTotal;
        }, 0);

        return {
            ...school,
            studentCount: schoolStudents.length,
            totalBillAmount,
        };
    });

    // Filter Schools based on inputs
    const filteredSchools = enrichedSchools.filter((school) => {
        const matchesName = nameFilter ? school.name.includes(nameFilter) : true;

        return matchesName;
    })

    // Sort schools by student count
    const sortedSchools = filteredSchools.sort((a, b) => {
        if (studentCountSortDirection === 'asc') return a.studentCount - b.studentCount;
        if (studentCountSortDirection === 'desc') return b.studentCount - a.studentCount;
        if (billAmountSortDirection === 'asc') return a.totalBillAmount - b.totalBillAmount;
        if (billAmountSortDirection === 'desc') return b.totalBillAmount - a.totalBillAmount;
        return 0;
    })

    // Handle sorting by highest student count
    const handleSortByHighestStudentCount = () => {
        setStudentCountSortDirection('desc')
    }

    // Handle sorting by lowest student count
    const handleSortByLowestStudentCount = () => {
        setStudentCountSortDirection('asc')
    }

    // Handle sorting by highest total bill amount
    const handleSortByHighestBillAmount = () => {
        setBillAmountSortDirection('desc')
    }

    // Handle sorting by lowest total bill amount
    const handleSortByLowestBillAmount = () => {
        setBillAmountSortDirection('asc')
    }

    // Select the School
    const selectSchool = async(school) => {
        setSelectedSchool(school)
    }

    // Handle back action
    const goBack = () => {
        setSelectedSchool(null)
        setExpandedLine(null)
    }

    // Open line students list
    const toggleLine = (index) => {
        setExpandedLine((prev) => (prev === index ? null : index));
    }

    const computeSchoolTotalAmounts = (school) => {
        // Filter students who belong to this school and are active this month
        const schoolStudents = riders.filter(student => 
            student.destination === school?.name &&
            student.bill?.[currentMonthKey]?.active
        );
    
        // Compute total amounts
        let totalAmount = 0;
        let totalDriverWages = 0;
        let totalCompanyCommission = 0;
    
        schoolStudents.forEach(student => {
            const bill = student.bill?.[currentMonthKey] || {};
            const complementaryBills = student.complementary_bill?.[currentMonthKey] || [];
    
            // Sum up amounts
            const driverCommission = bill.driver_commission_amount || 0;
            const companyCommission = bill.company_commission_amount || 0;
            const totalComplementaryAmount = complementaryBills.reduce((sum, comp) => sum + (comp.amount || 0), 0);
    
            // Accumulate totals
            totalDriverWages += driverCommission;
            totalCompanyCommission += companyCommission;
            totalAmount += driverCommission + companyCommission + totalComplementaryAmount;
        });

        // Now, check complementary wages from drivers
        drivers.forEach(driver => {
            const complementaryWages = driver.complementaryWages?.[currentMonthKey] || [];
            complementaryWages.forEach(comp => {
                const student = riders.find(r => r.id === comp.rider_id);
                if (!student || student.destination !== school?.name) return;

                totalDriverWages += comp.amount; // Add to driver wages
            });
        });
    
        return { totalAmount, totalDriverWages, totalCompanyCommission };
    };
    
    // Compute totals for selected school
    const { totalAmount, totalDriverWages, totalCompanyCommission } = computeSchoolTotalAmounts(selectedSchool);

    const computeDriverWagesForSchool = (school) => {
        let schoolDrivers = [];
    
        drivers.forEach(driver => {
            let driverTotalWage = 0;
            let studentsList = [];
    
            // Get all lines for this school
            const schoolLines = driver.line.filter(line => line.line_destination === school?.name);
    
            schoolLines.forEach(line => {
                line.riders.forEach(riderRef => {
                    const student = riders.find(r => r.id === riderRef.id);
                    if (!student || !student.bill?.[currentMonthKey]?.active) return;
    
                    const driverCommission = student.bill[currentMonthKey].driver_commission_amount || 0;
                    driverTotalWage += driverCommission;
    
                    studentsList.push({
                        name: student.full_name,
                        familyName:student.family_name,
                        amount: driverCommission
                    });
                });
            });
    
            // Check for complementary wages
            const complementaryWages = driver.complementaryWages?.[currentMonthKey] || [];
            complementaryWages.forEach(comp => {
                const student = riders.find(r => r.id === comp.rider_id);
                if (!student || student.destination !== school?.name) return;
    
                driverTotalWage += comp.amount;
                studentsList.push({
                    name: student.full_name,
                    familyName:student.family_name,
                    amount: comp.amount
                });
            });
    
            if (driverTotalWage > 0) {
                schoolDrivers.push({
                    driverName: driver.driver_full_name,
                    driverFamilyName: driver.driver_family_name,
                    totalWage: driverTotalWage,
                    students: studentsList
                });
            }
        });
    
        return schoolDrivers;
    };
    
    // Compute driver wages for selected school
    const schoolDrivers = computeDriverWagesForSchool(selectedSchool);

    // Export School list as excel file
    const exportSchoolsToExcel = () => {
        // Define the file name based on the selected month and year
        const fileName = `Sayartech_Schools_${selectedYear}-${String(selectedMonth).padStart(2, "0")}.xlsx`;
        const sheetName = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;

        // Prepare data for export
        const data = sortedSchools.map((school) => ({
            "المدرسة": school.name,
            "عدد الطلاب": school.studentCount,
            "المبلغ الجملي (دينار)": school.totalBillAmount.toLocaleString()
        }));

        // Convert data to a worksheet
        const ws = XLSX.utils.json_to_sheet(data);

        // Create a new workbook and append the sheet
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);

        // Save the file
        XLSX.writeFile(wb, fileName);
    };

  return (
    <div className='white_card-section-container'>
        {selectedSchool ? (
            <div className="item-detailed-data-container">
                <div className='item-detailed-data-header'>
                    <div className='item-detailed-data-header-title'>
                        <h5 style={{marginRight:'10px'}}>{selectedSchool.name || '-'}</h5>  
                    </div>
                    <button className="info-details-back-button" onClick={goBack}>
                        <BsArrowLeftShort size={24}/>
                    </button>
                </div>

                <div className="item-detailed-data-main">

                    <div className="item-detailed-data-main-firstBox">
                        <div className='school-firstBox-amounts'>
                            <div className='total-commission-box'>
                                <h5 style={{ color:'#955BFE' }}>المجموع</h5>
                                <div>
                                    <h5>{totalAmount.toLocaleString()}</h5>
                                    <h5 style={{marginRight:'4px'}}>دينار</h5>
                                </div>             
                            </div>
                            <div className='total-commission-box'>
                                <h5 style={{ color:'#955BFE' }}>اجرة السائقين</h5>
                                <div>
                                    <h5>{totalDriverWages.toLocaleString()}</h5>
                                    <h5 style={{marginRight:'4px'}}>دينار</h5>
                                </div>             
                            </div>
                            <div className='total-commission-box'>
                                <h5 style={{ color:'#955BFE' }}>حصة الشركة</h5>
                                <div>
                                    <h5>{totalCompanyCommission.toLocaleString()}</h5>
                                    <h5 style={{marginRight:'4px'}}>دينار</h5>
                                </div>             
                            </div>
                        </div>                    
                    </div>

                    <div className="item-detailed-data-main-second-box">
                        <div className="item-detailed-data-main-second-insider-box">
                        {schoolDrivers.length ? (
                            schoolDrivers.map((driver, index) => (
                                <div key={index} className="assinged-item-box-main">
                                    <div className="assinged-item-box-item">
                                        <div className='assinged-item-box-item-data'>
                                            <h5>{driver.driverName}</h5>
                                            <h5>{driver.driverFamilyName}</h5>
                                            <div>
                                                <h5>-</h5>
                                                <h5>{driver.totalWage.toLocaleString()}</h5>
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
                                        {driver.students.length ? (
                                            driver.students.map((student, idx) => (
                                                <div key={idx} className='student-dropdown-item'>
                                                    <div style={{display:'flex',flexDirection:'row-reverse'}}>
                                                        <h5 style={{marginLeft:'4px'}}>{student.name}</h5>
                                                        <h5>{student.familyName}</h5>
                                                    </div> 
                                                    <div style={{display:'flex',flexDirection:'row-reverse'}}>
                                                        <h5 style={{marginLeft:'4px'}}>{student.amount.toLocaleString()}</h5>
                                                        <h5>دينار</h5>
                                                    </div>                                              
                                                    
                                                </div>                               
                                            ))
                                        ) : (
                                            <h5 className="no-students">لا يوجد ركاب لهذا السائق</h5>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <h5 className="no-students">لا يوجد سائقين مرتبطين بهذه المدرسة</h5>
                        )}
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            <div>
                <div className='students-section-inner-titles'>                   
                    <div className='students-section-inner-title'>
                        <button className='excel-btn' onClick={exportSchoolsToExcel}>
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
                        <div className='driver-rating-box'>
                            <button onClick={handleSortByLowestStudentCount}>
                                <FaCaretDown 
                                size={18} 
                                className={studentCountSortDirection === 'asc' ? 'driver-rating-box-icon-active':'driver-rating-box-icon'}/>
                            </button>
                            <h5>الطلاب</h5>
                            <button onClick={handleSortByHighestStudentCount}>
                                <FaCaretUp 
                                size={18}
                                className={studentCountSortDirection === 'desc' ? 'driver-rating-box-icon-active':'driver-rating-box-icon'}/>
                            </button>
                        </div>
                    </div>
                    <div className="students-section-inner-title">
                        <div className='driver-rating-box'>
                            <button onClick={handleSortByLowestBillAmount}>
                                <FaCaretDown 
                                    size={18} 
                                    className={billAmountSortDirection === 'asc' ? 'driver-rating-box-icon-active' : 'driver-rating-box-icon'}
                                />
                            </button>
                            <h5>المبلغ الجملي</h5>
                            <button onClick={handleSortByHighestBillAmount}>
                                <FaCaretUp 
                                    size={18} 
                                    className={billAmountSortDirection === 'desc' ? 'driver-rating-box-icon-active' : 'driver-rating-box-icon'}
                                />
                            </button>
                        </div>
                    </div>
                </div>

                <div className='all-items-list'>
                    {sortedSchools.map((school,index) => (
                        <div key={index} onClick={() => selectSchool(school)} className="single-item">
                            <div>
                                <h5>{school.name}</h5>
                            </div>
                            <div>
                                <h5>{school.studentCount}</h5>
                            </div>
                            <div>
                                <h5>{school.totalBillAmount.toLocaleString()}</h5>
                            </div>
                        </div>
                    ))}                
                </div>

            </div>
        )}
    </div>
  )
}

export default schools