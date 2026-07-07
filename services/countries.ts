export type ProfileCountry = {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  localNumberMinLength: number;
  localNumberMaxLength: number;
};

const COUNTRY_DATA: ProfileCountry[] = [
  { code: "IN", name: "India", dialCode: "91", flag: "🇮🇳", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "AF", name: "Afghanistan", dialCode: "93", flag: "🇦🇫", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "AX", name: "Åland Islands", dialCode: "35818", flag: "🇦🇽", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "AL", name: "Albania", dialCode: "355", flag: "🇦🇱", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "DZ", name: "Algeria", dialCode: "213", flag: "🇩🇿", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "AS", name: "American Samoa", dialCode: "1684", flag: "🇦🇸", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "AD", name: "Andorra", dialCode: "376", flag: "🇦🇩", localNumberMinLength: 6, localNumberMaxLength: 6 },
  { code: "AO", name: "Angola", dialCode: "244", flag: "🇦🇴", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "AI", name: "Anguilla", dialCode: "1264", flag: "🇦🇮", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "AG", name: "Antigua and Barbuda", dialCode: "1268", flag: "🇦🇬", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "AR", name: "Argentina", dialCode: "54", flag: "🇦🇷", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "AM", name: "Armenia", dialCode: "374", flag: "🇦🇲", localNumberMinLength: 6, localNumberMaxLength: 6 },
  { code: "AW", name: "Aruba", dialCode: "297", flag: "🇦🇼", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "AU", name: "Australia", dialCode: "61", flag: "🇦🇺", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "AT", name: "Austria", dialCode: "43", flag: "🇦🇹", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "AZ", name: "Azerbaijan", dialCode: "994", flag: "🇦🇿", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "BS", name: "Bahamas", dialCode: "1242", flag: "🇧🇸", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "BH", name: "Bahrain", dialCode: "973", flag: "🇧🇭", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "BD", name: "Bangladesh", dialCode: "880", flag: "🇧🇩", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "BB", name: "Barbados", dialCode: "1246", flag: "🇧🇧", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "BY", name: "Belarus", dialCode: "375", flag: "🇧🇾", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "BE", name: "Belgium", dialCode: "32", flag: "🇧🇪", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "BZ", name: "Belize", dialCode: "501", flag: "🇧🇿", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "BJ", name: "Benin", dialCode: "229", flag: "🇧🇯", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "BM", name: "Bermuda", dialCode: "1441", flag: "🇧🇲", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "BT", name: "Bhutan", dialCode: "975", flag: "🇧🇹", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "BO", name: "Bolivia, Plurinational State of", dialCode: "591", flag: "🇧🇴", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "BA", name: "Bosnia and Herzegovina", dialCode: "387", flag: "🇧🇦", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "BW", name: "Botswana", dialCode: "267", flag: "🇧🇼", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "BR", name: "Brazil", dialCode: "55", flag: "🇧🇷", localNumberMinLength: 11, localNumberMaxLength: 11 },
  { code: "IO", name: "British Indian Ocean Territory", dialCode: "246", flag: "🇮🇴", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "BN", name: "Brunei Darussalam", dialCode: "673", flag: "🇧🇳", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "BG", name: "Bulgaria", dialCode: "359", flag: "🇧🇬", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "BF", name: "Burkina Faso", dialCode: "226", flag: "🇧🇫", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "BI", name: "Burundi", dialCode: "257", flag: "🇧🇮", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "KH", name: "Cambodia", dialCode: "855", flag: "🇰🇭", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "CM", name: "Cameroon", dialCode: "237", flag: "🇨🇲", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "CA", name: "Canada", dialCode: "1", flag: "🇨🇦", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "CV", name: "Cape Verde", dialCode: "238", flag: "🇨🇻", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "KY", name: "Cayman Islands", dialCode: "1345", flag: "🇰🇾", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "CF", name: "Central African Republic", dialCode: "236", flag: "🇨🇫", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "TD", name: "Chad", dialCode: "235", flag: "🇹🇩", localNumberMinLength: 6, localNumberMaxLength: 6 },
  { code: "CL", name: "Chile", dialCode: "56", flag: "🇨🇱", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "CN", name: "China", dialCode: "86", flag: "🇨🇳", localNumberMinLength: 11, localNumberMaxLength: 11 },
  { code: "CX", name: "Christmas Island", dialCode: "61", flag: "🇨🇽", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "CC", name: "Cocos (Keeling) Islands", dialCode: "61", flag: "🇨🇨", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "CO", name: "Colombia", dialCode: "57", flag: "🇨🇴", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "KM", name: "Comoros", dialCode: "269", flag: "🇰🇲", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "CG", name: "Congo", dialCode: "242", flag: "🇨🇬", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "CD", name: "Congo, the Democratic Republic of the", dialCode: "243", flag: "🇨🇩", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "CK", name: "Cook Islands", dialCode: "682", flag: "🇨🇰", localNumberMinLength: 5, localNumberMaxLength: 5 },
  { code: "CR", name: "Costa Rica", dialCode: "506", flag: "🇨🇷", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "CI", name: "Côte d\'Ivoire", dialCode: "225", flag: "🇨🇮", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "HR", name: "Croatia", dialCode: "385", flag: "🇭🇷", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "CU", name: "Cuba", dialCode: "53", flag: "🇨🇺", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "CW", name: "Curaçao", dialCode: "599", flag: "🇨🇼", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "CY", name: "Cyprus", dialCode: "357", flag: "🇨🇾", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "CZ", name: "Czech Republic", dialCode: "420", flag: "🇨🇿", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "DK", name: "Denmark", dialCode: "45", flag: "🇩🇰", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "DJ", name: "Djibouti", dialCode: "253", flag: "🇩🇯", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "DM", name: "Dominica", dialCode: "1767", flag: "🇩🇲", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "DO", name: "Dominican Republic", dialCode: "1809", flag: "🇩🇴", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "EC", name: "Ecuador", dialCode: "593", flag: "🇪🇨", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "EG", name: "Egypt", dialCode: "20", flag: "🇪🇬", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "SV", name: "El Salvador", dialCode: "503", flag: "🇸🇻", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "GQ", name: "Equatorial Guinea", dialCode: "240", flag: "🇬🇶", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "ER", name: "Eritrea", dialCode: "291", flag: "🇪🇷", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "EE", name: "Estonia", dialCode: "372", flag: "🇪🇪", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "ET", name: "Ethiopia", dialCode: "251", flag: "🇪🇹", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "FK", name: "Falkland Islands (Malvinas)", dialCode: "500", flag: "🇫🇰", localNumberMinLength: 5, localNumberMaxLength: 5 },
  { code: "FO", name: "Faroe Islands", dialCode: "298", flag: "🇫🇴", localNumberMinLength: 5, localNumberMaxLength: 5 },
  { code: "FJ", name: "Fiji", dialCode: "679", flag: "🇫🇯", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "FI", name: "Finland", dialCode: "358", flag: "🇫🇮", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "FR", name: "France", dialCode: "33", flag: "🇫🇷", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "GF", name: "French Guiana", dialCode: "594", flag: "🇬🇫", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "PF", name: "French Polynesia", dialCode: "689", flag: "🇵🇫", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "GA", name: "Gabon", dialCode: "241", flag: "🇬🇦", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "GM", name: "Gambia", dialCode: "220", flag: "🇬🇲", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "GE", name: "Georgia", dialCode: "995", flag: "🇬🇪", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "DE", name: "Germany", dialCode: "49", flag: "🇩🇪", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "GH", name: "Ghana", dialCode: "233", flag: "🇬🇭", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "GI", name: "Gibraltar", dialCode: "350", flag: "🇬🇮", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "GR", name: "Greece", dialCode: "30", flag: "🇬🇷", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "GL", name: "Greenland", dialCode: "299", flag: "🇬🇱", localNumberMinLength: 6, localNumberMaxLength: 6 },
  { code: "GD", name: "Grenada", dialCode: "1473", flag: "🇬🇩", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "GP", name: "Guadeloupe", dialCode: "590", flag: "🇬🇵", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "GU", name: "Guam", dialCode: "1671", flag: "🇬🇺", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "GT", name: "Guatemala", dialCode: "502", flag: "🇬🇹", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "GG", name: "Guernsey", dialCode: "441481", flag: "🇬🇬", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "GN", name: "Guinea", dialCode: "224", flag: "🇬🇳", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "GW", name: "Guinea-Bissau", dialCode: "245", flag: "🇬🇼", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "GY", name: "Guyana", dialCode: "592", flag: "🇬🇾", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "HT", name: "Haiti", dialCode: "509", flag: "🇭🇹", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "VA", name: "Holy See (Vatican City State)", dialCode: "379", flag: "🇻🇦", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "HN", name: "Honduras", dialCode: "504", flag: "🇭🇳", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "HK", name: "Hong Kong", dialCode: "852", flag: "🇭🇰", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "HU", name: "Hungary", dialCode: "36", flag: "🇭🇺", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "IS", name: "Iceland", dialCode: "354", flag: "🇮🇸", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "ID", name: "Indonesia", dialCode: "62", flag: "🇮🇩", localNumberMinLength: 11, localNumberMaxLength: 11 },
  { code: "IR", name: "Iran, Islamic Republic of", dialCode: "98", flag: "🇮🇷", localNumberMinLength: 11, localNumberMaxLength: 11 },
  { code: "IQ", name: "Iraq", dialCode: "964", flag: "🇮🇶", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "IE", name: "Ireland", dialCode: "353", flag: "🇮🇪", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "IM", name: "Isle of Man", dialCode: "441624", flag: "🇮🇲", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "IL", name: "Israel", dialCode: "972", flag: "🇮🇱", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "IT", name: "Italy", dialCode: "39", flag: "🇮🇹", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "JM", name: "Jamaica", dialCode: "1876", flag: "🇯🇲", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "JP", name: "Japan", dialCode: "81", flag: "🇯🇵", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "JE", name: "Jersey", dialCode: "441534", flag: "🇯🇪", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "JO", name: "Jordan", dialCode: "962", flag: "🇯🇴", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "KZ", name: "Kazakhstan", dialCode: "7", flag: "🇰🇿", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "KE", name: "Kenya", dialCode: "254", flag: "🇰🇪", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "KI", name: "Kiribati", dialCode: "686", flag: "🇰🇮", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "KP", name: "Korea, Democratic People\'s Republic of", dialCode: "850", flag: "🇰🇵", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "KR", name: "Korea, Republic of", dialCode: "82", flag: "🇰🇷", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "KW", name: "Kuwait", dialCode: "965", flag: "🇰🇼", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "KG", name: "Kyrgyzstan", dialCode: "996", flag: "🇰🇬", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "LA", name: "Lao People\'s Democratic Republic", dialCode: "856", flag: "🇱🇦", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "LV", name: "Latvia", dialCode: "371", flag: "🇱🇻", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "LB", name: "Lebanon", dialCode: "961", flag: "🇱🇧", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "LS", name: "Lesotho", dialCode: "266", flag: "🇱🇸", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "LR", name: "Liberia", dialCode: "231", flag: "🇱🇷", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "LY", name: "Libya", dialCode: "218", flag: "🇱🇾", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "LI", name: "Liechtenstein", dialCode: "423", flag: "🇱🇮", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "LT", name: "Lithuania", dialCode: "370", flag: "🇱🇹", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "LU", name: "Luxembourg", dialCode: "352", flag: "🇱🇺", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "MO", name: "Macao", dialCode: "853", flag: "🇲🇴", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "MK", name: "Macedonia, the Former Yugoslav Republic of", dialCode: "389", flag: "🇲🇰", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "MG", name: "Madagascar", dialCode: "261", flag: "🇲🇬", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "MW", name: "Malawi", dialCode: "265", flag: "🇲🇼", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "MY", name: "Malaysia", dialCode: "60", flag: "🇲🇾", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "MV", name: "Maldives", dialCode: "960", flag: "🇲🇻", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "ML", name: "Mali", dialCode: "223", flag: "🇲🇱", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "MT", name: "Malta", dialCode: "356", flag: "🇲🇹", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "MH", name: "Marshall Islands", dialCode: "692", flag: "🇲🇭", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "MQ", name: "Martinique", dialCode: "596", flag: "🇲🇶", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "MR", name: "Mauritania", dialCode: "222", flag: "🇲🇷", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "MU", name: "Mauritius", dialCode: "230", flag: "🇲🇺", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "YT", name: "Mayotte", dialCode: "262", flag: "🇾🇹", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "MX", name: "Mexico", dialCode: "52", flag: "🇲🇽", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "FM", name: "Micronesia, Federated States of", dialCode: "691", flag: "🇫🇲", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "MD", name: "Moldova, Republic of", dialCode: "373", flag: "🇲🇩", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "MC", name: "Monaco", dialCode: "377", flag: "🇲🇨", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "MN", name: "Mongolia", dialCode: "976", flag: "🇲🇳", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "ME", name: "Montenegro", dialCode: "382", flag: "🇲🇪", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "MS", name: "Montserrat", dialCode: "1664", flag: "🇲🇸", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "MA", name: "Morocco", dialCode: "212", flag: "🇲🇦", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "MZ", name: "Mozambique", dialCode: "258", flag: "🇲🇿", localNumberMinLength: 12, localNumberMaxLength: 12 },
  { code: "MM", name: "Myanmar", dialCode: "95", flag: "🇲🇲", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "NA", name: "Namibia", dialCode: "264", flag: "🇳🇦", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "NR", name: "Nauru", dialCode: "674", flag: "🇳🇷", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "NP", name: "Nepal", dialCode: "977", flag: "🇳🇵", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "NL", name: "Netherlands", dialCode: "31", flag: "🇳🇱", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "NC", name: "New Caledonia", dialCode: "687", flag: "🇳🇨", localNumberMinLength: 6, localNumberMaxLength: 6 },
  { code: "NZ", name: "New Zealand", dialCode: "64", flag: "🇳🇿", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "NI", name: "Nicaragua", dialCode: "505", flag: "🇳🇮", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "NE", name: "Niger", dialCode: "227", flag: "🇳🇪", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "NG", name: "Nigeria", dialCode: "234", flag: "🇳🇬", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "NU", name: "Niue", dialCode: "683", flag: "🇳🇺", localNumberMinLength: 4, localNumberMaxLength: 4 },
  { code: "NF", name: "Norfolk Island", dialCode: "672", flag: "🇳🇫", localNumberMinLength: 6, localNumberMaxLength: 6 },
  { code: "MP", name: "Northern Mariana Islands", dialCode: "1670", flag: "🇲🇵", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "NO", name: "Norway", dialCode: "47", flag: "🇳🇴", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "OM", name: "Oman", dialCode: "968", flag: "🇴🇲", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "PK", name: "Pakistan", dialCode: "92", flag: "🇵🇰", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "PW", name: "Palau", dialCode: "680", flag: "🇵🇼", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "PS", name: "Palestine, State of", dialCode: "970", flag: "🇵🇸", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "PA", name: "Panama", dialCode: "507", flag: "🇵🇦", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "PG", name: "Papua New Guinea", dialCode: "675", flag: "🇵🇬", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "PY", name: "Paraguay", dialCode: "595", flag: "🇵🇾", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "PE", name: "Peru", dialCode: "51", flag: "🇵🇪", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "PH", name: "Philippines", dialCode: "63", flag: "🇵🇭", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "PN", name: "Pitcairn", dialCode: "870", flag: "🇵🇳", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "PL", name: "Poland", dialCode: "48", flag: "🇵🇱", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "PT", name: "Portugal", dialCode: "351", flag: "🇵🇹", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "PR", name: "Puerto Rico", dialCode: "1787", flag: "🇵🇷", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "QA", name: "Qatar", dialCode: "974", flag: "🇶🇦", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "RE", name: "Réunion", dialCode: "262", flag: "🇷🇪", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "RO", name: "Romania", dialCode: "40", flag: "🇷🇴", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "RU", name: "Russian Federation", dialCode: "7", flag: "🇷🇺", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "RW", name: "Rwanda", dialCode: "250", flag: "🇷🇼", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "BL", name: "Saint Barthélemy", dialCode: "590", flag: "🇧🇱", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "SH", name: "Saint Helena, Ascension and Tristan da Cunha", dialCode: "290", flag: "🇸🇭", localNumberMinLength: 4, localNumberMaxLength: 4 },
  { code: "KN", name: "Saint Kitts and Nevis", dialCode: "1869", flag: "🇰🇳", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "LC", name: "Saint Lucia", dialCode: "1758", flag: "🇱🇨", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "MF", name: "Saint Martin (French part)", dialCode: "590", flag: "🇲🇫", localNumberMinLength: 6, localNumberMaxLength: 6 },
  { code: "PM", name: "Saint Pierre and Miquelon", dialCode: "508", flag: "🇵🇲", localNumberMinLength: 6, localNumberMaxLength: 6 },
  { code: "VC", name: "Saint Vincent and the Grenadines", dialCode: "1784", flag: "🇻🇨", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "WS", name: "Samoa", dialCode: "685", flag: "🇼🇸", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "SM", name: "San Marino", dialCode: "378", flag: "🇸🇲", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "ST", name: "Sao Tome and Principe", dialCode: "239", flag: "🇸🇹", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "SA", name: "Saudi Arabia", dialCode: "966", flag: "🇸🇦", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "SN", name: "Senegal", dialCode: "221", flag: "🇸🇳", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "RS", name: "Serbia", dialCode: "381", flag: "🇷🇸", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "SC", name: "Seychelles", dialCode: "248", flag: "🇸🇨", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "SL", name: "Sierra Leone", dialCode: "232", flag: "🇸🇱", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "SG", name: "Singapore", dialCode: "65", flag: "🇸🇬", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "SX", name: "Sint Maarten (Dutch part)", dialCode: "599", flag: "🇸🇽", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "SK", name: "Slovakia", dialCode: "421", flag: "🇸🇰", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "SI", name: "Slovenia", dialCode: "386", flag: "🇸🇮", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "SB", name: "Solomon Islands", dialCode: "677", flag: "🇸🇧", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "SO", name: "Somalia", dialCode: "252", flag: "🇸🇴", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "ZA", name: "South Africa", dialCode: "27", flag: "🇿🇦", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "SS", name: "South Sudan", dialCode: "211", flag: "🇸🇸", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "ES", name: "Spain", dialCode: "34", flag: "🇪🇸", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "LK", name: "Sri Lanka", dialCode: "94", flag: "🇱🇰", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "SD", name: "Sudan", dialCode: "249", flag: "🇸🇩", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "SR", name: "Suriname", dialCode: "597", flag: "🇸🇷", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "SJ", name: "Svalbard and Jan Mayen", dialCode: "47", flag: "🇸🇯", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "SZ", name: "Swaziland", dialCode: "268", flag: "🇸🇿", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "SE", name: "Sweden", dialCode: "46", flag: "🇸🇪", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "CH", name: "Switzerland", dialCode: "41", flag: "🇨🇭", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "SY", name: "Syrian Arab Republic", dialCode: "963", flag: "🇸🇾", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "TW", name: "Taiwan, Province of China", dialCode: "886", flag: "🇹🇼", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "TJ", name: "Tajikistan", dialCode: "992", flag: "🇹🇯", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "TZ", name: "Tanzania, United Republic of", dialCode: "255", flag: "🇹🇿", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "TH", name: "Thailand", dialCode: "66", flag: "🇹🇭", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "TL", name: "Timor-Leste", dialCode: "670", flag: "🇹🇱", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "TG", name: "Togo", dialCode: "228", flag: "🇹🇬", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "TK", name: "Tokelau", dialCode: "690", flag: "🇹🇰", localNumberMinLength: 5, localNumberMaxLength: 5 },
  { code: "TO", name: "Tonga", dialCode: "676", flag: "🇹🇴", localNumberMinLength: 5, localNumberMaxLength: 5 },
  { code: "TT", name: "Trinidad and Tobago", dialCode: "1868", flag: "🇹🇹", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "TN", name: "Tunisia", dialCode: "216", flag: "🇹🇳", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "TR", name: "Turkey", dialCode: "90", flag: "🇹🇷", localNumberMinLength: 11, localNumberMaxLength: 11 },
  { code: "TM", name: "Turkmenistan", dialCode: "993", flag: "🇹🇲", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "TC", name: "Turks and Caicos Islands", dialCode: "1649", flag: "🇹🇨", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "TV", name: "Tuvalu", dialCode: "688", flag: "🇹🇻", localNumberMinLength: 5, localNumberMaxLength: 5 },
  { code: "UG", name: "Uganda", dialCode: "256", flag: "🇺🇬", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "UA", name: "Ukraine", dialCode: "380", flag: "🇺🇦", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "AE", name: "United Arab Emirates", dialCode: "971", flag: "🇦🇪", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "GB", name: "United Kingdom", dialCode: "44", flag: "🇬🇧", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "US", name: "United States", dialCode: "1", flag: "🇺🇸", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "UY", name: "Uruguay", dialCode: "598", flag: "🇺🇾", localNumberMinLength: 8, localNumberMaxLength: 8 },
  { code: "UZ", name: "Uzbekistan", dialCode: "998", flag: "🇺🇿", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "VU", name: "Vanuatu", dialCode: "678", flag: "🇻🇺", localNumberMinLength: 5, localNumberMaxLength: 5 },
  { code: "VE", name: "Venezuela, Bolivarian Republic of", dialCode: "58", flag: "🇻🇪", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "VN", name: "Viet Nam", dialCode: "84", flag: "🇻🇳", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "VG", name: "Virgin Islands, British", dialCode: "1284", flag: "🇻🇬", localNumberMinLength: 7, localNumberMaxLength: 7 },
  { code: "VI", name: "Virgin Islands, U.S.", dialCode: "1340", flag: "🇻🇮", localNumberMinLength: 10, localNumberMaxLength: 10 },
  { code: "WF", name: "Wallis and Futuna", dialCode: "681", flag: "🇼🇫", localNumberMinLength: 6, localNumberMaxLength: 6 },
  { code: "YE", name: "Yemen", dialCode: "967", flag: "🇾🇪", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "ZM", name: "Zambia", dialCode: "260", flag: "🇿🇲", localNumberMinLength: 9, localNumberMaxLength: 9 },
  { code: "ZW", name: "Zimbabwe", dialCode: "263", flag: "🇿🇼", localNumberMinLength: 9, localNumberMaxLength: 9 },
];

export const PROFILE_COUNTRIES = COUNTRY_DATA;

export type ProfileCountryCode = (typeof PROFILE_COUNTRIES)[number]["code"];

export const DEFAULT_PROFILE_COUNTRY_CODE = "IN" satisfies ProfileCountryCode;

export const PROFILE_COUNTRY_CODES = PROFILE_COUNTRIES.map(
  (country) => country.code,
) as [ProfileCountryCode, ...ProfileCountryCode[]];

const PROFILE_COUNTRIES_BY_DIAL_CODE = [...PROFILE_COUNTRIES].sort(
  (left, right) => right.dialCode.length - left.dialCode.length,
);

export function getProfileCountry(code: string): ProfileCountry | undefined {
  return PROFILE_COUNTRIES.find((country) => country.code === code);
}

export function getProfileCountryOrDefault(code?: string | null): ProfileCountry {
  return getProfileCountry(code ?? "") ?? getProfileCountry(DEFAULT_PROFILE_COUNTRY_CODE)!;
}

export function formatProfileDialCode(dialCode: string): string {
  return `+${dialCode}`;
}

/** PNG flag URL via flagcdn.com — works on Windows where emoji flags render as letters (IN, PK). */
export function getCountryFlagUrl(code: string, width = 20): string {
  return `https://flagcdn.com/w${width}/${code.toLowerCase()}.png`;
}

export function isValidProfileLocalNumber(country: ProfileCountry, localNumber: string): boolean {
  const digits = localNumber.replace(/\D/g, "");
  if (!/^\d+$/.test(digits)) {
    return false;
  }
  return (
    digits.length >= country.localNumberMinLength && digits.length <= country.localNumberMaxLength
  );
}

export function parseStoredProfileWhatsApp(stored: string | null | undefined): {
  countryCode: string;
  localNumber: string;
} {
  const digits = (stored ?? "").replace(/\D/g, "");
  const defaultCountry = getProfileCountryOrDefault();

  for (const country of PROFILE_COUNTRIES_BY_DIAL_CODE) {
    if (digits.startsWith(country.dialCode)) {
      const localNumber = digits
        .slice(country.dialCode.length)
        .slice(0, country.localNumberMaxLength);
      return {
        countryCode: country.code,
        localNumber,
      };
    }
  }

  return {
    countryCode: defaultCountry.code,
    localNumber: digits.slice(0, defaultCountry.localNumberMaxLength),
  };
}

export function buildStoredProfileWhatsApp(countryCode: string, localNumber: string): string {
  const country = getProfileCountryOrDefault(countryCode);
  return `${country.dialCode}${localNumber.replace(/\D/g, "")}`;
}
